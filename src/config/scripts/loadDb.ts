// import { DataAPIClient } from "@datastax/astra-db-ts";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"; // đem về thư viện để chia nhỏ văn bản để llms có ngữ cảnh tốt hơn

// import "dotenv/config";

// type SimilarityMetric = "dot_product" | "cosine" | "euclidean";


// const f1Data = ["https://en.wikipedia.org/wiki/Formula_One_World_Championship"];

// const splitter = new RecursiveCharacterTextSplitter({
//   chunkSize: 512,
//   chunkOverlap: 100,
// });
  
// const createCollection = async (
//   similarityMetric: SimilarityMetric = "dot_product"
// ) => {
//   const res = await db.createCollection(ASTRA_DB_COLLECTION, {
//     vector: {
//       dimension: 1536,
//       metric: similarityMetric,
//     },
//   });
//   console.log(res);
// };

// const loadSampleData = async () => {
//   const collection = await db.collection(ASTRA_DB_COLLECTION);
//   for await (const url of f1Data) {
//     const content = await scrapePage(url);
//     const chunks = await splitter.splitText(content);
//     for await (const chunk of chunks) {
//       // Tạo embedding bằng Gemini
//       const model = genAI.getGenerativeModel({ model: "embedding-001" });
//       const embeddingResp = await model.embedContent(chunk);
//       const vector = embeddingResp.embedding.values;
//       const res = await collection.insertOne({
//         $vector: vector,
//         text: chunk,
//       });
//       console.log(res);
//     }
//   }
// };

// const scrapePage = async (url: string) => {
//   const loader = new PuppeteerWebBaseLoader(url, {
//     launchOptions: {
//       headless: true,
//     },
//     gotoOptions: {
//       waitUntil: "domcontentloaded",
//     },
//     evaluate: async (page, browser) => {
//       const result = await page.evaluate(() => {
//         return document.body.innerText;
//       });
//       await browser.close();
//       return result;
//     },
//   });
//   return (await loader.scrape())?.replace(/<[^>]*>?/gm, "");
// }; //langchain

// createCollection().then(() => loadSampleData());
