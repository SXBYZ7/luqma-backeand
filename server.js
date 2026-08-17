const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");

const app = express();

const PORT = process.env.PORT || 8080;

app.use(cors());

app.use(express.json({
  limit: "15mb"
}));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  : null;


/* الصفحة الرئيسية */

app.get("/", (req, res) => {

  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <title>لُقمة V4</title>
      </head>

      <body style="
        background:#111;
        color:white;
        font-family:Arial;
        text-align:center;
        padding:40px;
      ">

        <h1>🍽️ لُقمة</h1>

        <p>السيرفر يعمل بنجاح ✅</p>

        <p>Version V4</p>

      </body>
    </html>
  `);

});


/* فحص */

app.get("/health", (req, res) => {

  res.json({
    success: true,
    app: "Luqma",
    version: "V4",
    status: "online",
    openai: !!client
  });

});


/* اختبار API */

app.get("/api/test", (req, res) => {

  res.json({
    success: true,
    message: "Luqma API يعمل 🚀"
  });

});


/* تحليل الصورة */

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
          error: "OPENAI_API_KEY غير موجود"
        });

      }

      const base64 =
        req.file.buffer.toString("base64");

      const mime =
        req.file.mimetype || "image/jpeg";

      const image =
        `data:${mime};base64,${base64}`;


      const response =
        await client.responses.create({

          model:
            process.env.OPENAI_MODEL || "gpt-5.6",

          input: [

            {
              role: "user",

              content: [

                {
                  type: "input_text",

                  text: `
حلل هذه صورة الطعام.

أريد:

اسم الوجبة
السعرات التقريبية
البروتين
الكربوهيدرات
الدهون
المكونات
طريقة التحضير إن أمكن

أرجع JSON فقط بهذا الشكل:

{
  "title": "اسم الوجبة",
  "calories": 500,
  "protein": 30,
  "carbs": 50,
  "fat": 15,
  "ingredients": [],
  "steps": []
}

الأرقام تقديرية وليست دقيقة 100%.
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


      let text =
        response.output_text || "";


      text = text
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
          "الذكاء الاصطناعي لم يرجع JSON"
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
        data: data
      });


    } catch (error) {

      console.error(
        "ANALYZE ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        error:
          error.message ||
          "حدث خطأ أثناء التحليل"

      });

    }

  }
);


/* تحليل النص */

app.post(
  "/api/analyze-text",
  async (req, res) => {

    try {

      const text =
        req.body?.text;

      if (!text) {

        return res.status(400).json({
          success: false,
          error: "اكتب وصف الوجبة"
        });

      }

      if (!client) {

        return res.status(500).json({
          success: false,
          error: "OPENAI_API_KEY غير موجود"
        });

      }


      const response =
        await client.responses.create({

          model:
            process.env.OPENAI_MODEL || "gpt-5.6",

          input: `

أنت مساعد التغذية في تطبيق لُقمة.

حلل الوجبة التالية:

${text}

أرجع JSON فقط:

{
  "title": "اسم الوجبة",
  "calories": 500,
  "protein": 30,
  "carbs": 50,
  "fat": 15,
  "ingredients": [],
  "steps": []
}

`

        });


      let result =
        response.output_text || "";


      result =
        result
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();


      const first =
        result.indexOf("{");

      const last =
        result.lastIndexOf("}");


      const data =
        JSON.parse(
          result.substring(
            first,
            last + 1
          )
        );


      res.json({
        success: true,
        data: data
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
          "حدث خطأ"

      });

    }

  }
);


/* تشغيل */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Luqma V4 running on port ${PORT}`
    );

  }
);