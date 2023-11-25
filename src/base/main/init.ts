// DehtoBot for dehto German Course
// Developed by Yaroslav Volkivskyi (TheLaidSon)

// Actual v4.9.3

// Initialization File

import { Telegraf } from "telegraf";
import { createClient } from "redis";
import { MongoClient } from "mongodb";
import express from 'express';
import { google, sheets_v4 } from "googleapis";

async function connectToClubDB() {
  try {
    const client = new MongoClient('mongodb://localhost:27017/?family=4');

    await client.connect();

    console.log("Done");
    return client;
  } catch (error) {
    console.error('\n\nFatal Error to connect to MongoDB:\n', error);
    process.exit(1);
  }
}

export default async function init() {

  console.log("\n     DehtoBot v4.8.3\n\n   Developed by Yaroslav Volkivskyi (TheLaidSon)\n\n\n");

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

  console.log("Connecting to mongodb...")
  const dbclub = await connectToClubDB();
  console.log("Done");

  console.log("Creating telegraf bot instanse...");
  // prod
  // const token : string = '6503582186:AAF-dg1FCpXR0jI_tXXoeEpw7lFJSmbwGUs';
  // dev
  const token : string = '6192445742:AAHSlflbQoeylaqx3hZAh0WkS3fZ1Bt8sdU';
  const bot = new Telegraf(token);
  console.log("Done\n");

  console.log("Creating new google auth instanse")
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  console.log("Done");

  console.log("Creating google apis client...");
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  console.log("Done");

  app.listen(port, () => {
    console.log(`Server started at ${port}\n\n\n BOT READY TO WORK!\n\n`);
  });

  // wrap redis with helper functions
  const wRedis = ({
    getAll: (id: number) => async () => redis.hGetAll(`${id}`),
    get: (id: number) => async (property: string) => await redis.hGet(`${id}`, property),
    set: (id: number) => (property: string) => async (new_value: string) => await redis.hSet(`${id}`, property, new_value)
  })

  const values = sheets.spreadsheets.values,
    spreadsheetId = "1nWR2A0cnyuCI5zMjMjdIJlHcm0SeHcUqE4kfpYK42P8";

  const wSheets = ({
    get: (range: string) => values.get({
      auth,
      spreadsheetId,
      range
    }),

    updateRow: (range: string, row: (string | number)[]) => values.update({
      auth,
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    }),

    appendRow: (row: (string | number)[]) => values.append({
      auth,
      spreadsheetId,
      range: "Sheet1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    }),

    deleteRow: async (rowIndex: number, sheetId: number) => {
      // const range = `Sheet1!A${rowIndex}:D${rowIndex}`;

      const deleteOperation: sheets_v4.Schema$Request = {
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          },
        },
      };

      try {
        const response = await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [deleteOperation],
          },
        } as sheets_v4.Params$Resource$Spreadsheets$Batchupdate);

        console.log('\nRow successfully deleted: ', response.data);
      } catch (error) {
        console.error('\nError to delete row, details: ', error);
      }
    },

    getCell: async (cell: string) => {
      const getOperation: sheets_v4.Params$Resource$Spreadsheets$Values$Get = {
        spreadsheetId,
        range: cell,
      };
    
      try {
        const response = await sheets.spreadsheets.values.get(getOperation);
    
        const values = response.data.values;
        if (values && values.length > 0) {
          console.log(`Значение ячейки ${cell}: ${values[0][0]}`);
          return values[0][0];
        } else {
          console.log(`Ячейка ${cell} пуста.`);
          return '';
        }
      } catch (error) {
        console.error('Ошибка при получении значения из ячейки', error);
      }
    }    
  })

  return [bot, wRedis, app, token, dbclub, wSheets] as const;
}