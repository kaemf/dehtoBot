// DehtoBot for dehto German Course
// Developed by Yaroslav Volkivskyi (TheLaidSon)

// Actual v3.5.3

// Initialization File

import { Telegraf } from "telegraf";
import { createClient } from "redis";
import express from 'express';


export default async function init() {

  console.log("\n     DehtoBot v3.5.3\n\n   Developed by Yaroslav Volkivskyi (TheLaidSon)\n\n\n");

  console.log("Creating redis client...");
  const redis = createClient();
  redis.on("error", (err) => console.log("Redis Client Error", err));
  console.log("Done");

  console.log("Connecting to redis server...");
  await redis.connect();
  console.log("Done");

  const app = express();
  const port = 3000;
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  app.listen(port, () => {
    console.log(`\nServer started at ${port}\n`);
  });

  console.log("Creating telegraf bot instanse...");
  // prod
  // const token : string = '6503582186:AAF-dg1FCpXR0jI_tXXoeEpw7lFJSmbwGUs';
  const token : string = '6192445742:AAHSlflbQoeylaqx3hZAh0WkS3fZ1Bt8sdU';
  const bot = new Telegraf(token);
  // dev
  // const bot = new Telegraf("6192445742:AAHSlflbQoeylaqx3hZAh0WkS3fZ1Bt8sdkU");
  console.log("Done\n\n BOT READY TO WORK!\n\n");


  // console.log("Creating new google auth instanse")
  // const auth = new google.auth.GoogleAuth({
  //   keyFile: "credentials.json",
  //   scopes: "https://www.googleapis.com/auth/spreadsheets",
  // });
  // console.log("Done");

  // console.log("Creating google apis client...");
  // const client = await auth.getClient();
  // const sheets = google.sheets({ version: "v4", auth: client });
  // console.log("Done");

  //const wRedis = wrapRedis(redis);

  // wrap redis with helper functions
  const wRedis = ({
    getAll: (id: number) => async () => redis.hGetAll(`${id}`),
    get: (id: number) => async (property: string) => await redis.hGet(`${id}`, property),
    set: (id: number) => (property: string) => async (new_value: string) => await redis.hSet(`${id}`, property, new_value)
  })

  // const values = sheets.spreadsheets.values;
  // const spreadsheetId = "1GTx8JBrJ-RdX-Fpd6wBKNfXwRDifOKOkjVH8uyEaZx8";
  // const wSheets = ({
  //   get: (range: string) => values.get({
  //     auth,
  //     spreadsheetId,
  //     range
  //   }),

  //   updateRow: (range: string, row: (string | number)[]) => values.update({
  //     auth,
  //     spreadsheetId,
  //     range,
  //     valueInputOption: "USER_ENTERED",
  //     requestBody: {
  //       values: [row],
  //     },
  //   }),

  //   appendRow: (row: (string | number)[]) => values.append({
  //     auth,
  //     spreadsheetId,
  //     range: "Sheet1",
  //     valueInputOption: "USER_ENTERED",
  //     requestBody: {
  //       values: [row],
  //     },
  //   })
  // })

  return [bot, wRedis, app, token] as const;
}


// const initialState: UserScriptState = "Greeting";
// const changeState = async (id: number, newState: UserScriptState) => {
//   await redis.hSet(`${id}`, "state", `${newState}`);
// };
// const getState = async (id: number): Promise<UserScriptState> =>
//   ((await redis.hGet(`${id}`, "state")) as UserScriptState) ?? initialState;

// const inlineApprovePayment = (id: number) =>
//   Markup.inlineKeyboard([
//     Markup.button.callback("👌", `approvePayment:${id}`),
//     Markup.button.callback("❌", `rejectPayment:${id}`),
//   ]);