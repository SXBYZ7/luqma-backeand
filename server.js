const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 8080;

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
   عرض واجهة لُقمة
========================= */

app.use(
  express.static(
    path.join(__dirname)
  )
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

  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );

});

/* =========================
   Health
========================= */

app.get("/health", (req, res) => {

  res.json({
    success: true,
    app: "لُقمة",
    version: "4.0",
    status: "online",
    port: PORT,
    openai: !!process.env.OPENAI_API_KEY
  });

});

/* =========================
   API Test
========================= */

app.get("/api/test", (req, res) => {

  res.json({
    success: true,
    app: "لُقمة",
    message: "Luqma API يعمل بشكل صحيح 🚀"
  });

});

/* =========================
   OpenAI Check
========================= */

function checkOpenAI(res) {

  if (
    !process.env.OPENAI_API_KEY ||
    !client
  ) {

    res.status(500).json({

      success: false,

      error:
        "OPENAI_API_KEY غير موجود في Railway"

    });

    return false;
  }

  return true;
}

/* =========================
   AI
========================= */

async function askAI(
  prompt,
  imageData = null
) {

  if (!client) {

    throw new Error(
      "OPENAI_API_KEY غير موجود"
    );

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

  const response =
    await client.responses.create({

      model:
        process.env.OPENAI_MODEL ||
        "gpt-5.6",

      input: [

        {
          role: "user",

          content: content

        }

      ]

    });

  return response.output_text || "";

}

/* =========================
   JSON Parser
========================= */

function parseJSON(text) {

  let clean =
    String(text || "")
      .replace(
        /```json/gi,
        ""
      )
      .replace(
        /```/g,
        ""
      )
      .trim();

  const first =
    clean.indexOf("{");

  const last =
    clean.lastIndexOf("}");

  if (
    first !== -1 &&
    last !== -1 &&
    last > first
  ) {

    clean =
      clean.substring(
        first,
        last + 1
      );

  }

  try {

    return JSON.parse(
      clean
    );

  } catch (error) {

    throw new Error(
      "الذكاء الاصطناعي لم يرجع JSON صالح"
    );

  }

}

/* =========================
   تحليل صورة
========================= */

app.post(
  "/api/analyze-image",

  upload.single("image"),

  async (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({

          success: false,

          error:
            "لم يتم إرسال صورة"

        });

      }

      if (!checkOpenAI(res)) {
        return;
      }

      const mime =
        req.file.mimetype ||
        "image/jpeg";

      const base64 =
        req.file.buffer.toString(
          "base64"
        );

      const imageData =
        `data:${mime};base64,${base64}`;

      const prompt = `

أنت "لُقمة"، مساعد ذكي متخصص بالطعام والتغذية.

حلل صورة الوجبة المرفقة.

حدد بشكل تقريبي:

- اسم الوجبة
- الأطعمة الموجودة
- كمية كل طعام
- السعرات
- البروتين
- الكربوهيدرات
- الدهون
- المكونات
- خطوات التحضير إذا أمكن استنتاجها

مهم:

لا تدّعي أن الأرقام دقيقة 100%.

الصورة لا تكفي لمعرفة الوزن الحقيقي.

استخدم تقديرات منطقية.

أرجع JSON فقط.

الشكل:

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

      const result =
        await askAI(
          prompt,
          imageData
        );

      const data =
        parseJSON(result);

      res.json({

        success: true,

        ...data

      });

    }

    catch (error) {

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
   تحليل النص
========================= */

app.post(
  "/api/analyze-text",

  async (req, res) => {

    try {

      const text =
        req.body?.text;

      if (!text) {

        return res.status(400).json({

          success: false,

          error:
            "لم يتم إرسال النص"

        });

      }

      if (!checkOpenAI(res)) {
        return;
      }

      const prompt = `

أنت "لُقمة"، مساعد ذكي متخصص بالوصفات والتغذية.

حلل النص التالي:

${text}

استخرج الوصفة والمكونات والكميات والخطوات.

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

      const result =
        await askAI(prompt);

      const data =
        parseJSON(result);

      res.json({

        success: true,

        ...data

      });

    }

    catch (error) {

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
   إنشاء وصفة
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

          error:
            "لم يتم إرسال المكونات"

        });

      }

      if (!checkOpenAI(res)) {
        return;
      }

      const prompt = `

أنت شيف وخبير تغذية في تطبيق "لُقمة".

المكونات:

${ingredients}

أنشئ وصفة مناسبة.

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

      const result =
        await askAI(prompt);

      const data =
        parseJSON(result);

      res.json({

        success: true,

        ...data

      });

    }

    catch (error) {

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
   404
========================= */

app.use(
  (req, res) => {

    res.status(404).json({

      success: false,

      error:
        "الصفحة أو المسار غير موجود"

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
      `Luqma V4 running on port ${PORT}`
    );

  }
);