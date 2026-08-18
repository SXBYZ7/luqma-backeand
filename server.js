const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");

const app = express();

const PORT = process.env.PORT || 8080;

app.use(cors());

app.use(express.json({
  limit: "10mb"
}));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


/* =========================
   الصفحة الرئيسية
========================= */

app.get("/", (req, res) => {

  res.json({
    app: "لُقمة",
    status: "online",
    version: "10.0",
    service: "AI Food Analysis"
  });

});


/* =========================
   Health
========================= */

app.get("/health", (req, res) => {

  res.json({
    status: "online",
    app: "Luqma",
    version: "10.0",
    openai: !!process.env.OPENAI_API_KEY
  });

});


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
          error: "لم يتم اختيار صورة"
        });

      }

      if (!process.env.OPENAI_API_KEY) {

        return res.status(500).json({
          error: "مفتاح OpenAI غير موجود"
        });

      }

      const base64 =
        req.file.buffer.toString("base64");

      const mime =
        req.file.mimetype || "image/jpeg";

      const image =
        `data:${mime};base64,${base64}`;


      const response =
        await openai.responses.create({

          model:
            process.env.OPENAI_MODEL ||
            "gpt-5.6",

          input: [

            {
              role: "user",

              content: [

                {
                  type: "input_text",

                  text: `
أنت لُقمة، مساعد ذكاء اصطناعي متخصص بالطعام والتغذية.

حلل صورة الوجبة.

قدّر:
- اسم الوجبة
- السعرات الحرارية
- البروتين
- الكربوهيدرات
- الدهون
- الألياف
- المكونات
- كمية كل مكون
- طريقة التحضير إن أمكن

الأرقام تقديرية لأن الصورة لا تستطيع تحديد الوزن الحقيقي بدقة.

أرجع JSON فقط بهذا الشكل:

{
  "title": "اسم الوجبة",
  "calories": 500,
  "protein": 30,
  "carbs": 50,
  "fat": 15,
  "fiber": 5,
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
`
                },

                {
                  type: "input_image",
                  image_url: image
                }

              ]

            }

          ]

        });


      const result =
        response.output_text || "";

      const data =
        extractJSON(result);


      res.json(data);

    }

    catch (error) {

      console.error(
        "IMAGE ANALYSIS ERROR:",
        error
      );

      res.status(500).json({

        error:
          error.message ||
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
          error: "لم يتم إرسال النص"
        });

      }

      const response =
        await openai.responses.create({

          model:
            process.env.OPENAI_MODEL ||
            "gpt-5.6",

          input: `

أنت لُقمة، مساعد متخصص بالطعام والتغذية.

حلل الوجبة التالية:

${text}

قدّر السعرات والبروتين والكارب والدهون والألياف.

أرجع JSON فقط:

{
  "title": "اسم الوجبة",
  "calories": 500,
  "protein": 30,
  "carbs": 50,
  "fat": 15,
  "fiber": 5,
  "ingredients": [],
  "steps": []
}

`
        });


      const data =
        extractJSON(
          response.output_text
        );


      res.json(data);

    }

    catch (error) {

      console.error(
        "TEXT ANALYSIS ERROR:",
        error
      );

      res.status(500).json({

        error:
          error.message ||
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
          error: "أرسل المكونات أولاً"
        });

      }

      const response =
        await openai.responses.create({

          model:
            process.env.OPENAI_MODEL ||
            "gpt-5.6",

          input: `

أنت شيف وخبير تغذية في تطبيق لُقمة.

المكونات:

${ingredients}

أنشئ وصفة مناسبة.

أرجع JSON فقط:

{
  "title": "اسم الوصفة",
  "calories": 500,
  "protein": 30,
  "carbs": 50,
  "fat": 15,
  "fiber": 5,
  "ingredients": [],
  "steps": []
}

`
        });


      const data =
        extractJSON(
          response.output_text
        );


      res.json(data);

    }

    catch (error) {

      console.error(
        "RECIPE ERROR:",
        error
      );

      res.status(500).json({

        error:
          error.message ||
          "حدث خطأ أثناء إنشاء الوصفة"

      });

    }

  }
);


/* =========================
   استخراج JSON
========================= */

function extractJSON(text) {

  let clean =
    String(text || "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

  const start =
    clean.indexOf("{");

  const end =
    clean.lastIndexOf("}");

  if (
    start === -1 ||
    end === -1
  ) {

    throw new Error(
      "لم يتم الحصول على JSON صحيح من الذكاء الاصطناعي"
    );

  }

  return JSON.parse(
    clean.substring(
      start,
      end + 1
    )
  );

}


/* =========================
   تشغيل السيرفر
========================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Luqma AI Server 10.0 running on port ${PORT}`
    );

  }
);