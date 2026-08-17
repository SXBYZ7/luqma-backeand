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
    limit: "5mb"
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});


/* =========================
   OpenAI
========================= */

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


/* =========================
   الصفحة الرئيسية
========================= */

app.get("/", (req, res) => {

  res.json({
    app: "لُقمة",
    version: "V3",
    status: "online",
    message: "Luqma Backend يعمل بنجاح ✅"
  });

});


/* =========================
   اختبار API
========================= */

app.get("/api/test", (req, res) => {

  res.json({
    success: true,
    message: "Luqma API يعمل بشكل صحيح 🚀"
  });

});


/* =========================
   دالة الذكاء الاصطناعي
========================= */

async function askAI(prompt, imageData = null) {

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

  return response.output_text;
}


/* =========================
   تنظيف JSON
========================= */

function parseJSON(text) {

  let clean = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
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

  return JSON.parse(clean);
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
          error: "لم يتم إرسال صورة"
        });

      }


      if (!process.env.OPENAI_API_KEY) {

        return res.status(500).json({
          error: "OPENAI_API_KEY غير موجود في Railway"
        });

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

مهم:

لا يمكنك معرفة الوزن الحقيقي بدقة من الصورة.

لذلك استخدم تقديرات معقولة، ولا تدّعي أن الأرقام دقيقة 100%.

أريد JSON فقط، بدون أي كلام خارجه.

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

إذا كان شيء غير واضح في الصورة، اذكره كتقدير وليس كحقيقة.

`;


      const result =
        await askAI(
          prompt,
          imageData
        );


      const data =
        parseJSON(result);


      res.json(data);

    }

    catch (error) {

      console.error(
        "IMAGE ERROR:",
        error
      );

      res.status(500).json({

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

      const text =
        req.body?.text;


      if (!text) {

        return res.status(400).json({
          error: "لم يتم إرسال النص"
        });

      }


      if (!process.env.OPENAI_API_KEY) {

        return res.status(500).json({
          error: "OPENAI_API_KEY غير موجود في Railway"
        });

      }


      const prompt = `

أنت "لُقمة"، مساعد ذكي متخصص بالوصفات والتغذية.

حلل النص التالي:

${text}

استخرج الوصفة والمكونات والكميات والخطوات.

احسب السعرات والقيم الغذائية بشكل تقريبي.

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


      const result =
        await askAI(prompt);


      const data =
        parseJSON(result);


      res.json(data);

    }

    catch (error) {

      console.error(
        "TEXT ERROR:",
        error
      );

      res.status(500).json({

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
          error: "لم يتم إرسال المكونات"
        });

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


      const result =
        await askAI(prompt);


      const data =
        parseJSON(result);


      res.json(data);

    }

    catch (error) {

      console.error(
        "RECIPE ERROR:",
        error
      );

      res.status(500).json({

        error:
          error?.message ||
          "حدث خطأ أثناء إنشاء الوصفة"

      });

    }

  }
);


/* =========================
   تشغيل السيرفر
========================= */

app.listen(
  PORT,
  "8.0.8.0",
  () => {

    console.log(
      `Luqma Backend V3 running on port ${PORT}`
    );

  }
);