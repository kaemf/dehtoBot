// DehtoBot for dehto German Course
// Developed by Yaroslav Volkivskyi (TheLaidSon)

// Actual v4.11.0

// Initialization File

import { Telegraf } from "telegraf";
import { createClient } from "redis";
import { MongoClient } from "mongodb";
import express from 'express';
import { google, sheets_v4 } from "googleapis";
import { getColorCell, getBordersCell } from "../handlers/sheetStyleHandler";
import { versionBot } from "../../data/datapoint/point/chats";

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

  console.log(`\n     DehtoBot ${versionBot}\n\n   Developed by Yaroslav Volkivskyi (TheLaidSon)\n\n\n`);

  console.log("Creating redis client...");
  const redis = createClient();
  redis.on("error", (err) => console.log("Redis Client Error", err));
  console.log("Done");

  console.log("Connecting to redis server...");
  await redis.connect();
  console.log("Done");

  const app = express();
  // const port = 3000;
  // app.use(express.json());
  // app.use(express.urlencoded({ extended: true }));

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

  console.log("Creating google auth instanse")
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  console.log("Done");

  console.log("Creating google apis client...");
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  console.log("Done\n\n\n BOT READY TO WORK!\n\n");

  // app.listen(port, () => {
  //   console.log(`Server started at ${port}\n\n\n BOT READY TO WORK!\n\n`);
  // });

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
          console.log(`Data from cell "${cell}": "${values[0][0]}"`);
          return values[0][0];
        } else {
          console.log(`Cell: "${cell}" empty!`);
          return '';
        }
      } catch (error) {
        console.error(`Fail to get data from cell "${cell}"`, error);
      }
    },

    addRowAndShiftDown: async (sheetId: string, targetCell: string) => {
      const targetRowIndex = Number(targetCell.match(/\d+/)![0]),

      getSheetId = async (sheetName: string) => {
        const { data } = await sheets.spreadsheets.get({
          spreadsheetId,
        });
      
        const sheet = data.sheets!.find((s) => s.properties!.title === sheetName);
        return sheet!.properties!.sheetId;
      }
    
      const insertOperation: sheets_v4.Schema$Request = {
        insertDimension: {
          range: {
            sheetId: await getSheetId(sheetId),
            dimension: 'ROWS',
            startIndex: targetRowIndex - 1,
            endIndex: targetRowIndex,
          },
          inheritFromBefore: false,
        },
      };
    
      try {
        // Выполняем batchUpdate
        const response = await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [insertOperation],
          },
        } as sheets_v4.Params$Resource$Spreadsheets$Batchupdate);
    
        console.log('New Data successfully added', response.data);
      } catch (error) {
        console.error('Fail to add data to google sheets', error);
      }
    },

    findDataInCell: async (targetData: string, sheetId: string) => {
      try {
        const response = await sheets.spreadsheets.values.get({
          auth,
          spreadsheetId,
          range: sheetId,
        });
    
        const values = response.data.values;

        if (values){
          for (let row = 0; row < values!.length; row++) {
            for (let col = 0; col < values![row].length; col++) {
              const cellValue = values![row][col];
              if (cellValue === targetData) {
                console.log(`Data found in "${targetData}" in row "${String.fromCharCode('A'.charCodeAt(0) + col)}${row + 1}"`);
                return { row, col };
              }
            }
          }
        }
        else{
          const row = '', col = '';
          return {row, col};
        }

        console.log(`Data '${targetData}' not found`);
      } catch (error) {
        console.error('Error to find: ', error);
        const row = '', col = '';
        return {row, col};
      }
    },

    getLastValueInColumn: async () => {
      try {
        const range = `💁🏽‍♀️ Студенти_dev!A:A`;
        const response = await sheets.spreadsheets.values.get({
          auth,
          spreadsheetId,
          range,
        });
    
        const values = response.data.values;
    
        if (!values || values.length === 0) {
          return { value: null, row: null };
        }
    
        const reversedValues = values.reverse();
        const lastValueIndex = reversedValues.findIndex((cell) => cell[0] !== '');
    
        if (lastValueIndex === -1) {
          return { value: null, row: null };
        }
    
        const lastValue = reversedValues[lastValueIndex][0];
        const lastRowIndex = values.length - lastValueIndex;
    
        return { value: lastValue, row: lastRowIndex };
      } catch (error) {
        console.error('Error to get Data: ', error);
        return null;
      }
    },

    setCellStyle: async (sheetID: string, range: string, fontSize: number, bold: boolean, horizontalAlignment: string,
      verticalAlignment: string, topBorder: string | null, bottomBorder: string | null, leftBorder: string | null, rightBorder: string | null, color: string) => {
      const parseRange = (range: string) => {
        const regex = /([A-Z]+)(\d+):([A-Z]+)(\d+)/;
        const match = range.match(regex);
      
        const _startColumn = match![1];
        const _startRow = parseInt(match![2], 10);
        const _endColumn = match![3];
        const _endRow = parseInt(match![4], 10);
      
        return [_startColumn, _startRow, _endColumn, _endRow];
      },
      parseA1Notation = (a1Notation: string) => {
        const regex = /([A-Z]+)(\d+)/;
        const match = a1Notation.match(regex);
      
        const _startColumn = match![1];
        const _startRow = parseInt(match![2], 10);
      
        return [_startColumn, _startRow];
      },
      getSheetId = async (sheetName: string) => {
        const { data } = await sheets.spreadsheets.get({
          spreadsheetId,
        });
      
        const sheet = data.sheets!.find((s) => s.properties!.title === sheetName);
        return sheet!.properties!.sheetId;
      }, isRange = range.includes(':');
    
      let _startRow, _endRow, _startColumn, _endColumn,
        startRow, endRow, startColumn: string, endColumn: string;
    
      if (isRange) {
        [_startColumn, _startRow, _endColumn, _endRow] = parseRange(range);
      } else {
        [_startRow, _endRow] = parseA1Notation(range);
      }

      startRow = parseInt(_startRow.toString());
      endRow = parseInt(_endRow.toString());
      startColumn = _startColumn!.toString();
      endColumn = _endColumn!.toString();
    
      const values = {
        userEnteredFormat: {
          textFormat: {
            fontSize: fontSize,
            bold: bold,
            italic: false,
            underline: false,
          },
          horizontalAlignment: horizontalAlignment,
          verticalAlignment: verticalAlignment,
          borders: getBordersCell(topBorder, bottomBorder, leftBorder, rightBorder),
          backgroundColor: getColorCell(color),
        },
      };
    
      const requests = [
        {
          updateCells: {
            rows: Array.from({ length: endRow - startRow + 1 }, () => ({
              values: Array.from({ length: endColumn.charCodeAt(0) - startColumn.charCodeAt(0) + 1 }, () => ({ userEnteredFormat: values.userEnteredFormat }))
            })),
            range: {
              sheetId: await getSheetId(sheetID),
              startRowIndex: startRow - 1,
              endRowIndex: endRow,
              startColumnIndex: startColumn.charCodeAt(0) - 'A'.charCodeAt(0),
              endColumnIndex: endColumn.charCodeAt(0) - 'A'.charCodeAt(0) + 1,
            },
            fields: 'userEnteredFormat.textFormat,userEnteredFormat.horizontalAlignment,userEnteredFormat.verticalAlignment,userEnteredFormat.borders,userEnteredFormat.backgroundColor',
          },
        },
      ];
      
      const request = {
        spreadsheetId,
        resource: {
          requests,
        },
        auth,
      };
    
      try {
        const response = await sheets.spreadsheets.batchUpdate(request);
        console.log(`New Style Applied for:` +response.data);
      } catch (err) {
        console.error(`Error to Apply Style: ${err}`);
      }
    }
  })

  return [bot, wRedis, app, token, dbclub, wSheets] as const;
}