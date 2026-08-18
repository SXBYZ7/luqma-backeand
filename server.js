const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");

const app = express();

const PORT = process.env.PORT || 8080;

/* =========================
   Middleware
========================= */

app.use(cors());

app.use(express.json({
  limit: "10mb"
}));

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

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  : null;


/* =========================
   الرئيسية
========================= */

app.get("/", (req, res) => {

  res.json({
    app: "Luqma",
    version: "V9",
    status: "online",
    message: "Luqma Backend يعمل ✅"
  });

});


/* =========================
   Health
========================= */

app.get("/health", (req, res) => {

  res.json({
    success: true,
    status: "online",
    version: "V9",
    openai: !!client
  });

});


/* =========================
   API Test
========================= */

app.get("/api/test", (req, res) => {

  res.json({
    success: true,
    message: "Luqma API يعمل بشكل صحيح 🚀"
  });

});


/* =========================
   تحليل الصورة
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


      if (!client) {

        return res.status(500).json({
          success: false,
          error: "OPENAI_API_KEY غير موجود في Railway"
        });

      }


      const base64 =
        req.file.buffer.toString("base64");

      const mime =
        req.file.mimetype || "image/jpeg";

      const imageUrl =
        `data:${mime};base64,${base64}`;


      const response =
        await client.responses.create({

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
أنت "لُقمة"، مساعد ذكي متخصص بالطعام والتغذية.

حلل صورة الوجبة.

قدّر:

- اسم الوجبة
- السعرات
- البروتين
- الكربوهيدرات
- الدهون
- الألياف
- المكونات
- الكميات التقريبية
- طريقة التحضير إن أمكن

مهم:
الأرقام تقديرية وليست دقيقة 100%.

أرجع JSON فقط بدون Markdown.

الشكل:

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
                  image_url: imageUrl
                }

              ]
            }

          ]

        });


      let text =
        response.output_text || "";


      text =
        text
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();


      const first =
        text.indexOf("{");

      const last =
        text.lastIndexOf("}");


      if (
        first === -1 ||
        last === -1
      ) {

        throw new Error(
          "الذكاء الاصطناعي لم يرجع JSON صحيح"
        );

      }


      const data =
        JSON.parse(
          text.substring(
            first,
            last + 1
          )
        );


      res.json({

        success: true,

        data

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
          success: false,
          error: "لم يتم إرسال النص"
        });

      }


      if (!client) {

        return res.status(500).json({
          success: false,
          error: "OPENAI_API_KEY غير موجود في Railway"
        });

      }


      const response =
        await client.responses.create({

          model:
            process.env.OPENAI_MODEL ||
            "gpt-5.6",

          input: `

أنت "لُقمة"، خبير تغذية.

حلل هذه الوجبة:

${text}

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


      let output =
        response.output_text || "";


      output =
        output
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();


      const first =
        output.indexOf("{");

      const last =
        output.lastIndexOf("}");


      const data =
        JSON.parse(
          output.substring(
            first,
            last + 1
          )
        );


      res.json({

        success: true,

        data

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
          success: false,
          error: "لم يتم إرسال المكونات"
        });

      }


      if (!client) {

        return res.status(500).json({
          success: false,
          error: "OPENAI_API_KEY غير موجود في Railway"
        });

      }


      const response =
        await client.responses.create({

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


      let output =
        response.output_text || "";


      output =
        output
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();


      const first =
        output.indexOf("{");

      const last =
        output.lastIndexOf("}");


      const data =
        JSON.parse(
          output.substring(
            first,
            last + 1
          )
        );


      res.json({

        success: true,

        data

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
          error.message ||
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
  "0.0.0.0",
  () => {

    console.log(
      `LUQMA V9 RUNNING ON PORT ${PORT}`
    );

  }
);