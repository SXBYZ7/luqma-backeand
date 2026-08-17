const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");

const app = express();

const PORT = process.env.PORT || 3000;

/* =========================
   Middleware
========================= */

app.use(cors());

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

/* =========================
   Upload
========================= */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

/* =========================
   OpenAI
========================= */

let client = null;

if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

/* =========================
   الصفحة الرئيسية
========================= */

app.get("/", (req, res) => {
  res.status(200).json({
    app: "لُقمة",
    version: "V3",
    status: "online",
    message: "Luqma Backend يعمل بنجاح ✅"
  });
});

/* =========================
   Health Check
========================= */

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    port: PORT,
    openai: !!process.env.OPENAI_API_KEY
  });
});

/* =========================
   اختبار API
========================= */

app.get("/api/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Luqma API يعمل بشكل صحيح 🚀"
  });
});

/* =========================
   التحقق من OpenAI
========================= */

function checkOpenAI(res) {
  if (!process.env.OPENAI_API_KEY || !client) {
    res.status(500).json({
      success: false,
      error: "OPENAI_API_KEY غير موجود في Railway"
    });

    return false;
  }

  return true;
}

/* =========================
   دالة الذكاء الاصطناعي
========================= */

async function askAI(prompt, imageData = null) {
  if (!client) {
    throw new Error("OPENAI_API_KEY غير موجود");
  }

  const content = [
    {
      type: "input_text",
      text: prompt
    }
  ];

  if (imageData) {
    content.push({
      type: "input_image",
      image_url: imageData
    });
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.6",
    input: [
      {
        role: "user",
        content
      }
    ]
  });

  return response.output_text || "";
}

/* =========================
   تنظيف وتحليل JSON
========================= */

function parseJSON(text) {
  let clean = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");

  if (first !== -1 && last !== -1 && last > first) {
    clean = clean.substring(first, last + 1);
  }

  try {
    return JSON.parse(clean);
  } catch (error) {
    throw new Error(
      "الذكاء الاصطناعي لم يرجع JSON صالح. الرد كان: " +
      clean.substring(0, 500)
    );
  }
}

/* =========================
   تحليل صورة وجبة
========================= */

app.post(
  "/api/analyze-image",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "لم يتم إرسال صورة"
        });
      }

      if (!checkOpenAI(res)) {
        return;
      }

      const mime = req.file.mimetype || "image/jpeg";

      const base64 = req.file.buffer.toString("base64");

      const imageData = `data:${mime};base64,${base64}`;

      const prompt = `
أنت "لُقمة"، مساعد ذكي متخصص بالطعام والتغذية.

حلل صورة الوجبة المرفقة.

حاول تحديد:

- اسم الوجبة
- الأطعمة الموجودة
- الكمية التقريبية
- السعرات
- البروتين
- الكربوهيدرات
- الدهون
- المكونات
- خطوات التحضير إذا كان بالإمكان استنتاجها

مهم جدًا:

لا يمكنك معرفة الوزن الحقيقي بدقة من الصورة.

لذلك استخدم تقديرات معقولة، ولا تدّعي أن الأرقام دقيقة 100%.

إذا كان الطعام غير واضح، اذكر ذلك كتقدير.

أريد JSON فقط بدون أي كلام خارجه.

استخدم هذا الشكل:

{
  "title": "اسم الوجبة",
  "calories": 500,
  "macros": {
    "protein": 30,
    "carbs": 50,
    "fat": 15
  },
  "ingredients": [
    {
      "name": "دجاج",
      "amount": "150 غرام"
    }
  ],
  "steps": [
    "الخطوة الأولى",
    "الخطوة الثانية"
  ]
}
`;

      const result = await askAI(
        prompt,
        imageData
      );

      const data = parseJSON(result);

      res.status(200).json({
        success: true,
        ...data
      });

    } catch (error) {
      console.error(
        "IMAGE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error?.message ||
          "حدث خطأ أثناء تحليل الصورة"
      });
    }
  }
);

/* =========================
   تحليل وصفة أو مكونات
========================= */

app.post(
  "/api/analyze-text",
  async (req, res) => {
    try {
      const text = req.body?.text;

      if (!text) {
        return res.status(400).json({
          success: false,
          error: "لم يتم إرسال النص"
        });
      }

      if (!checkOpenAI(res)) {
        return;
      }

      const prompt = `
أنت "لُقمة"، مساعد ذكي متخصص بالوصفات والتغذية.

حلل النص التالي:

${text}

استخرج:

- اسم الوصفة
- المكونات
- الكميات
- خطوات التحضير
- السعرات
- البروتين
- الكربوهيدرات
- الدهون

احسب القيم الغذائية بشكل تقريبي.

أرجع JSON فقط بدون أي نص خارجه.

الشكل المطلوب:

{
  "title": "اسم الوصفة",
  "calories": 500,
  "macros": {
    "protein": 30,
    "carbs": 50,
    "fat": 15
  },
  "ingredients": [
    {
      "name": "اسم المكون",
      "amount": "الكمية"
    }
  ],
  "steps": [
    "الخطوة الأولى",
    "الخطوة الثانية"
  ]
}
`;

      const result = await askAI(prompt);

      const data = parseJSON(result);

      res.status(200).json({
        success: true,
        ...data
      });

    } catch (error) {
      console.error(
        "TEXT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error?.message ||
          "حدث خطأ أثناء تحليل النص"
      });
    }
  }
);

/* =========================
   إنشاء وصفة من مكونات
========================= */

app.post(
  "/api/recipe",
  async (req, res) => {
    try {
      const ingredients =
        req.body?.ingredients;

      if (!ingredients) {
        return res.status(400).json({
          success: false,
          error: "لم يتم إرسال المكونات"
        });
      }

      if (!checkOpenAI(res)) {
        return;
      }

      const prompt = `
أنت شيف وخبير تغذية في تطبيق "لُقمة".

هذه المكونات:

${ingredients}

أنشئ وصفة مناسبة منها.

احسب السعرات والقيم الغذائية بشكل تقريبي.

أرجع JSON فقط:

{
  "title": "اسم الوصفة",
  "calories": 500,
  "macros": {
    "protein": 30,
    "carbs": 50,
    "fat": 15
  },
  "ingredients": [
    {
      "name": "اسم المكون",
      "amount": "الكمية"
    }
  ],
  "steps": [
    "الخطوة الأولى",
    "الخطوة الثانية"
  ]
}
`;

      const result = await askAI(prompt);

      const data = parseJSON(result);

      res.status(200).json({
        success: true,
        ...data
      });

    } catch (error) {
      console.error(
        "RECIPE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error?.message ||
          "حدث خطأ أثناء إنشاء الوصفة"
      });
    }
  }
);

/* =========================
   صفحة 404
========================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "المسار غير موجود",
    path: req.originalUrl
  });
});

/* =========================
   أخطاء عامة
========================= */

app.use(
  (err, req, res, next) => {
    console.error(
      "SERVER ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      error:
        err?.message ||
        "خطأ داخلي في السيرفر"
    });
  }
);

/* =========================
   تشغيل السيرفر
========================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Luqma Backend V3 running on port ${PORT}`
    );
  }
);