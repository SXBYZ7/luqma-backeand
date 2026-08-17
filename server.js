const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 8080;

/* =====================================================
   إعدادات
===================================================== */

app.use(cors());

app.use(express.json({
  limit: "15mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "15mb"
}));

/* =====================================================
   الملفات
===================================================== */

app.use(express.static(__dirname));

/* =====================================================
   رفع الصور
===================================================== */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

/* =====================================================
   OpenAI
===================================================== */

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  : null;

/* =====================================================
   الصفحة الرئيسية
===================================================== */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(__dirname, "index.html")
  );

});

/* =====================================================
   فحص السيرفر
===================================================== */

app.get("/health", (req, res) => {

  res.json({
    success: true,
    app: "لُقمة",
    version: "V4",
    status: "online",
    port: PORT,
    openai: !!openai
  });

});

/* =====================================================
   اختبار API
===================================================== */

app.get("/api/test", (req, res) => {

  res.json({
    success: true,
    app: "لُقمة",
    version: "V4",
    message: "Luqma API يعمل بشكل صحيح 🚀"
  });

});

/* =====================================================
   التأكد من OpenAI
===================================================== */

function checkOpenAI(res) {

  if (!openai) {

    res.status(500).json({
      success: false,
      error: "OPENAI_API_KEY غير موجود في Railway"
    });

    return false;
  }

  return true;
}

/* =====================================================
   استدعاء الذكاء الاصطناعي
===================================================== */

async function askAI(prompt, imageData = null) {

  if (!openai) {
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
    await openai.responses.create({

      model:
        process.env.OPENAI_MODEL || "gpt-5.6",

      input: [
        {
          role: "user",
          content: content
        }
      ]

    });

  return response.output_text || "";
}

/* =====================================================
   تنظيف JSON
===================================================== */

function parseJSON(text) {

  let clean = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");

  if (
    first !== -1 &&
    last !== -1 &&
    last > first
  ) {

    clean = clean.substring(
      first,
      last + 1
    );

  }

  return JSON.parse(clean);
}

/* =====================================================
   تحليل صورة وجبة
===================================================== */

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

      const mime =
        req.file.mimetype || "image/jpeg";

      const base64 =
        req.file.buffer.toString("base64");

      const imageData =
        `data:${mime};base64,${base64}`;

      const prompt = `

أنت "لُقمة"، مساعد ذكي متخصص بالطعام والتغذية.

حلل صورة الوجبة.

حاول تحديد:

- اسم الوجبة
- الأطعمة الموجودة
- الكمية التقريبية
- السعرات
- البروتين
- الكربوهيدرات
- الدهون
- الألياف
- المكونات
- خطوات التحضير إذا أمكن

مهم:
لا تدّعي الدقة 100%.
الصورة لا تكفي لمعرفة الوزن الحقيقي.

أرجع JSON فقط.

الشكل:

{
  "title": "اسم الوجبة",
  "calories": 500,
  "macros": {
    "protein": 30,
    "carbs": 50,
    "fat": 15,
    "fiber": 5
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

    } catch (error) {

      console.error(
        "IMAGE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "حدث خطأ أثناء تحليل الصورة"
      });

    }

  }
);

/* =====================================================
   تحليل نص
===================================================== */

app.post(
  "/api/analyze-text",
  async (req, res) => {

    try {

      const text =
        req.body?.text;

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

أنت "لُقمة"، خبير وصفات وتغذية.

حلل النص:

${text}

استخرج:

- اسم الوصفة
- المكونات
- الكميات
- طريقة التحضير
- السعرات
- البروتين
- الكارب
- الدهون
- الألياف

أرجع JSON فقط:

{
  "title": "اسم الوصفة",
  "calories": 500,
  "macros": {
    "protein": 30,
    "carbs": 50,
    "fat": 15,
    "fiber": 5
  },
  "ingredients": [
    {
      "name": "المكون",
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

    } catch (error) {

      console.error(
        "TEXT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "حدث خطأ أثناء تحليل النص"
      });

    }

  }
);

/* =====================================================
   إنشاء وصفة من مكونات
===================================================== */

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

أنت شيف وخبير تغذية في تطبيق لُقمة.

المكونات:

${ingredients}

أنشئ وصفة مناسبة.

احسب بشكل تقريبي:

- السعرات
- البروتين
- الكارب
- الدهون
- الألياف

أرجع JSON فقط:

{
  "title": "اسم الوصفة",
  "calories": 500,
  "macros": {
    "protein": 30,
    "carbs": 50,
    "fat": 15,
    "fiber": 5
  },
  "ingredients": [
    {
      "name": "المكون",
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

    } catch (error) {

      console.error(
        "RECIPE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "حدث خطأ أثناء إنشاء الوصفة"
      });

    }

  }
);

/* =====================================================
   استخراج وصفة من رابط
===================================================== */

app.post(
  "/api/extract-recipe",
  async (req, res) => {

    try {

      const url =
        String(
          req.body?.url || ""
        ).trim();

      if (!url) {

        return res.status(400).json({
          success: false,
          error: "ضع رابط الفيديو أولاً"
        });

      }

      const isTikTok =
        /tiktok\.com/i.test(url);

      const isInstagram =
        /instagram\.com/i.test(url);

      if (
        !isTikTok &&
        !isInstagram
      ) {

        return res.status(400).json({
          success: false,
          error:
            "الرابط يجب أن يكون TikTok أو Instagram"
        });

      }

      /*
       * حاليا لا نخدع المستخدم:
       * OpenAI لا يشاهد فيديو TikTok/Instagram
       * بمجرد إرسال الرابط.
       */

      res.json({

        success: false,

        needsContent: true,

        source: url,

        error:
          "تم استلام الرابط، لكن استخراج محتوى الفيديو يحتاج الوصول إلى الفيديو أو نص الوصفة أولاً."

      });

    } catch (error) {

      console.error(
        "EXTRACT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "حدث خطأ أثناء استخراج الوصفة"
      });

    }

  }
);

/* =====================================================
   API 404
===================================================== */

app.use(
  "/api",
  (req, res) => {

    res.status(404).json({
      success: false,
      error: "API غير موجود"
    });

  }
);

/* =====================================================
   تشغيل
===================================================== */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Luqma Backend V4 running on port ${PORT}`
    );

  }
);