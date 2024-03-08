// class GoogleSheets{
//     private students = '💁🏽‍♀️ Студенти_dev';

//     async appendLessonToUser(idUser: number, name: string, phone: string, nickname: string, mail: string, date: string, title: string, teacher: string){
//       const index = await sheets.findDataInCell(idUser.toString(), this.students),
//         row = index?.row === undefined ? '' : index!.row;

//       if (row !== ''){
//         let currentData = await sheets.getCell(`${this.students}!A${parseInt(row!.toString()) + 3}`),
//           position = parseInt(row!.toString()) + 3;

//         while (currentData !== ''){
//           position++;
//           currentData = await sheets.getCell(`${this.students}!A${position}`);
//         }

//         const toProcessPosition = await sheets.getCell(`${this.students}!A${position - 1}`),
//           newIndexPosition = toProcessPosition;

//         await sheets.addRowAndShiftDown(this.students, `A${position}`);
//         console.log(currentData.charAt(0));
//         await sheets.updateRow(`${this.students}!A${position}:D${position}`, [`${parseInt(newIndexPosition) + 1}`, date, title, teacher]);

//         await sheets.setCellStyle(this.students, `A${position}:A${position}`, 10, false, 'LEFT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
//         await sheets.setCellStyle(this.students, `B${position}:B${position}`, 10, false, 'RIGHT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
//         await sheets.setCellStyle(this.students, `C${position}:E${position}`, 10, false, 'LEFT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
//       }
//       else{
//         const newIndex = await sheets.getLastValueInColumn();
//         let newRow = newIndex?.row === null ? 1 : newIndex!.row;

//         if (newRow === 1){
//           await sheets.updateRow(`${this.students}!A${newRow}:E${newRow}`, [idUser, name, phone, nickname, mail]);
//           await sheets.updateRow(`${this.students}!A${newRow + 1}:E${newRow + 1}`, ['№:',	'Дата:', 'Тема:', 'Викладач:', 'Оплата:']);
//           await sheets.updateRow(`${this.students}!A${newRow + 2}:D${newRow + 2}`, [1, date, title, teacher]);

//           await sheets.setCellStyle(this.students, `A${newRow}:A${newRow}`, 13, true, 'RIGHT', 'MIDDLE', 'SOLID', 'SOLID', 'SOLID', 'SOLID', 'green');
//           await sheets.setCellStyle(this.students, `B${newRow}:B${newRow}`, 13, true, 'LEFT', 'MIDDLE', 'SOLID', 'SOLID', 'SOLID', 'SOLID', 'green');
//           await sheets.setCellStyle(this.students, `C${newRow}:D${newRow}`, 10, false, 'LEFT', 'MIDDLE', 'SOLID', 'SOLID', 'SOLID', 'SOLID', 'green');
//           await sheets.setCellStyle(this.students, `E${newRow}:E${newRow}`, 9, false, 'LEFT', 'MIDDLE', 'SOLID', 'SOLID', 'SOLID', 'SOLID', 'green');

//           await sheets.setCellStyle(this.students, `A${newRow + 1}:E${newRow + 1}`, 10, true, 'LEFT', 'MIDDLE', null, 'SOLID', 'SOLID', 'SOLID', 'white');

//           await sheets.setCellStyle(this.students, `A${newRow + 2}:A${newRow + 2}`, 10, false, 'LEFT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
//           await sheets.setCellStyle(this.students, `B${newRow + 2}:B${newRow + 2}`, 10, false, 'RIGHT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
//           await sheets.setCellStyle(this.students, `C${newRow + 2}:E${newRow + 2}`, 10, false, 'LEFT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
//         }
//         else{
//           await sheets.updateRow(`${this.students}!A${newRow + 2}:E${newRow + 2}`, [idUser, name, phone, nickname, mail]);
//           await sheets.updateRow(`${this.students}!A${newRow + 3}:E${newRow + 3}`, ['№:',	'Дата:', 'Тема:', 'Викладач:', 'Оплата:']);
//           await sheets.updateRow(`${this.students}!A${newRow + 4}:D${newRow + 4}`, [1, date, title, teacher]);
  
//           await sheets.setCellStyle(this.students, `A${newRow + 2}:A${newRow + 2}`, 13, true, 'RIGHT', 'MIDDLE', 'SOLID', 'SOLID', 'SOLID', 'SOLID', 'green');
//           await sheets.setCellStyle(this.students, `B${newRow + 2}:B${newRow + 2}`, 13, true, 'LEFT', 'MIDDLE', 'SOLID', 'SOLID', 'SOLID', 'SOLID', 'green');
//           await sheets.setCellStyle(this.students, `C${newRow + 2}:D${newRow + 2}`, 10, false, 'LEFT', 'MIDDLE', 'SOLID', 'SOLID', 'SOLID', 'SOLID', 'green');
//           await sheets.setCellStyle(this.students, `E${newRow + 2}:E${newRow + 2}`, 9, false, 'LEFT', 'MIDDLE', 'SOLID', 'SOLID', 'SOLID', 'SOLID', 'green');
  
//           await sheets.setCellStyle(this.students, `A${newRow + 3}:E${newRow + 3}`, 10, true, 'LEFT', 'MIDDLE', null, 'SOLID', 'SOLID', 'SOLID', 'white');
  
//           await sheets.setCellStyle(this.students, `A${newRow + 4}:A${newRow + 4}`, 10, false, 'LEFT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
//           await sheets.setCellStyle(this.students, `B${newRow + 4}:B${newRow + 4}`, 10, false, 'RIGHT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
//           await sheets.setCellStyle(this.students, `C${newRow + 4}:E${newRow + 4}`, 10, false, 'LEFT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
//         }
//       }

//     }

//     async changeAvaibleLessonStatus(idUser: number, payment: boolean){
//       const index = await sheets.findDataInCell(idUser.toString(), this.students),
//         rowIndex = index?.row === undefined ? '' : index!.row;

//       if (rowIndex !== ''){
//         const row = parseInt(rowIndex.toString()) + 1;
        
//         if (payment){
//           await sheets.setCellStyle(this.students, `A${row}:A${row}`, 13, true, 'RIGHT', 'MIDDLE', null, null, null, null, 'green');
//           await sheets.setCellStyle(this.students, `B${row}:B${row}`, 13, true, 'LEFT', 'MIDDLE', null, null, null, null, 'green');
//           await sheets.setCellStyle(this.students, `C${row}:D${row}`, 10, false, 'LEFT', 'MIDDLE', null, null, null, null, 'green');
//           await sheets.setCellStyle(this.students, `E${row}:E${row}`, 9, false, 'LEFT', 'MIDDLE', null, null, null, null, 'green');
//         }
//         else{
//           await sheets.setCellStyle(this.students, `A${row}:A${row}`, 13, true, 'RIGHT', 'MIDDLE', null, null, null, null, 'red');
//           await sheets.setCellStyle(this.students, `B${row}:B${row}`, 13, true, 'LEFT', 'MIDDLE', null, null, null, null, 'red');
//           await sheets.setCellStyle(this.students, `C${row}:D${row}`, 10, false, 'LEFT', 'MIDDLE', null, null, null, null, 'red');
//           await sheets.setCellStyle(this.students, `E${row}:E${row}`, 9, false, 'LEFT', 'MIDDLE', null, null, null, null, 'red');
//         }
//       }
//     }

//     async CheckHaveUser(idUser: number){
//       const index = await sheets.findDataInCell(idUser.toString(), this.students),
//         rowIndex = index?.row === undefined ? '' : index!.row;

//       if (rowIndex !== ''){
//         return rowIndex;
//       }
//       else return false;
//     }

//     async ChangeUserNameInSheet(idUser: number, name: string){
//       const rowAroundChange = await this.CheckHaveUser(idUser);

//       if (rowAroundChange){
//         await sheets.updateRow(`${this.students}!B${parseInt(rowAroundChange.toString()) + 1}`, [name]);
//       }
//     }
//   }


// FROM INIT
// console.log("Creating google auth instanse")
//   const auth = new google.auth.GoogleAuth({
//     keyFile: "credentials.json",
//     scopes: "https://www.googleapis.com/auth/spreadsheets",
//   });
//   console.log("Done");

// console.log("Creating google apis client...");
//   const client = await auth.getClient();
//   const sheets = google.sheets({ version: "v4", auth: client });
//   console.log("Done\n\n\n BOT READY TO WORK!\n\n");

// const values = sheets.spreadsheets.values,
//     spreadsheetId = "1nWR2A0cnyuCI5zMjMjdIJlHcm0SeHcUqE4kfpYK42P8";

//   const wSheets = ({
//     get: (range: string) => values.get({
//       auth,
//       spreadsheetId,
//       range
//     }),

//     updateRow: (range: string, row: (string | number)[]) => values.update({
//       auth,
//       spreadsheetId,
//       range,
//       valueInputOption: "USER_ENTERED",
//       requestBody: {
//         values: [row],
//       },
//     }),

//     appendRow: (row: (string | number)[]) => values.append({
//       auth,
//       spreadsheetId,
//       range: "Sheet1",
//       valueInputOption: "USER_ENTERED",
//       requestBody: {
//         values: [row],
//       },
//     }),

//     deleteRow: async (rowIndex: number, sheetId: number) => {
//       const deleteOperation: sheets_v4.Schema$Request = {
//         deleteDimension: {
//           range: {
//             sheetId,
//             dimension: 'ROWS',
//             startIndex: rowIndex - 1,
//             endIndex: rowIndex,
//           },
//         },
//       };

//       try {
//         const response = await sheets.spreadsheets.batchUpdate({
//           spreadsheetId,
//           resource: {
//             requests: [deleteOperation],
//           },
//         } as sheets_v4.Params$Resource$Spreadsheets$Batchupdate);

//         console.log('\nRow successfully deleted: ', response.data);
//       } catch (error) {
//         console.error('\nError to delete row, details: ', error);
//       }
//     },

//     getCell: async (cell: string) => {
//       const getOperation: sheets_v4.Params$Resource$Spreadsheets$Values$Get = {
//         spreadsheetId,
//         range: cell,
//       };
    
//       try {
//         const response = await sheets.spreadsheets.values.get(getOperation);
    
//         const values = response.data.values;
//         if (values && values.length > 0) {
//           console.log(`Data from cell "${cell}": "${values[0][0]}"`);
//           return values[0][0];
//         } else {
//           console.log(`Cell: "${cell}" empty!`);
//           return '';
//         }
//       } catch (error) {
//         console.error(`Fail to get data from cell "${cell}"`, error);
//       }
//     },

//     addRowAndShiftDown: async (sheetId: string, targetCell: string) => {
//       const targetRowIndex = Number(targetCell.match(/\d+/)![0]),

//       getSheetId = async (sheetName: string) => {
//         const { data } = await sheets.spreadsheets.get({
//           spreadsheetId,
//         });
      
//         const sheet = data.sheets!.find((s) => s.properties!.title === sheetName);
//         return sheet!.properties!.sheetId;
//       }
    
//       const insertOperation: sheets_v4.Schema$Request = {
//         insertDimension: {
//           range: {
//             sheetId: await getSheetId(sheetId),
//             dimension: 'ROWS',
//             startIndex: targetRowIndex - 1,
//             endIndex: targetRowIndex,
//           },
//           inheritFromBefore: false,
//         },
//       };
    
//       try {
//         // Выполняем batchUpdate
//         const response = await sheets.spreadsheets.batchUpdate({
//           spreadsheetId,
//           resource: {
//             requests: [insertOperation],
//           },
//         } as sheets_v4.Params$Resource$Spreadsheets$Batchupdate);
    
//         console.log('New Data successfully added', response.data);
//       } catch (error) {
//         console.error('Fail to add data to google sheets', error);
//       }
//     },

//     findDataInCell: async (targetData: string, sheetId: string) => {
//       try {
//         const response = await sheets.spreadsheets.values.get({
//           auth,
//           spreadsheetId,
//           range: sheetId,
//         });
    
//         const values = response.data.values;

//         if (values){
//           for (let row = 0; row < values!.length; row++) {
//             for (let col = 0; col < values![row].length; col++) {
//               const cellValue = values![row][col];
//               if (cellValue === targetData) {
//                 console.log(`Data found in "${targetData}" in row "${String.fromCharCode('A'.charCodeAt(0) + col)}${row + 1}"`);
//                 return { row, col };
//               }
//             }
//           }
//         }
//         else{
//           const row = '', col = '';
//           return {row, col};
//         }

//         console.log(`Data '${targetData}' not found`);
//       } catch (error) {
//         console.error('Error to find: ', error);
//         const row = '', col = '';
//         return {row, col};
//       }
//     },

//     getLastValueInColumn: async () => {
//       try {
//         const range = `💁🏽‍♀️ Студенти_dev!A:A`;
//         const response = await sheets.spreadsheets.values.get({
//           auth,
//           spreadsheetId,
//           range,
//         });
    
//         const values = response.data.values;
    
//         if (!values || values.length === 0) {
//           return { value: null, row: null };
//         }
    
//         const reversedValues = values.reverse();
//         const lastValueIndex = reversedValues.findIndex((cell) => cell[0] !== '');
    
//         if (lastValueIndex === -1) {
//           return { value: null, row: null };
//         }
    
//         const lastValue = reversedValues[lastValueIndex][0];
//         const lastRowIndex = values.length - lastValueIndex;
    
//         return { value: lastValue, row: lastRowIndex };
//       } catch (error) {
//         console.error('Error to get Data: ', error);
//         return null;
//       }
//     },

//     setCellStyle: async (sheetID: string, range: string, fontSize: number, bold: boolean, horizontalAlignment: string,
//       verticalAlignment: string, topBorder: string | null, bottomBorder: string | null, leftBorder: string | null, rightBorder: string | null, color: string) => {
//       const parseRange = (range: string) => {
//         const regex = /([A-Z]+)(\d+):([A-Z]+)(\d+)/;
//         const match = range.match(regex);
      
//         const _startColumn = match![1];
//         const _startRow = parseInt(match![2], 10);
//         const _endColumn = match![3];
//         const _endRow = parseInt(match![4], 10);
      
//         return [_startColumn, _startRow, _endColumn, _endRow];
//       },
//       parseA1Notation = (a1Notation: string) => {
//         const regex = /([A-Z]+)(\d+)/;
//         const match = a1Notation.match(regex);
      
//         const _startColumn = match![1];
//         const _startRow = parseInt(match![2], 10);
      
//         return [_startColumn, _startRow];
//       },
//       getSheetId = async (sheetName: string) => {
//         const { data } = await sheets.spreadsheets.get({
//           spreadsheetId,
//         });
      
//         const sheet = data.sheets!.find((s) => s.properties!.title === sheetName);
//         return sheet!.properties!.sheetId;
//       }, isRange = range.includes(':');
    
//       let _startRow, _endRow, _startColumn, _endColumn,
//         startRow, endRow, startColumn: string, endColumn: string;
    
//       if (isRange) {
//         [_startColumn, _startRow, _endColumn, _endRow] = parseRange(range);
//       } else {
//         [_startRow, _endRow] = parseA1Notation(range);
//       }

//       startRow = parseInt(_startRow.toString());
//       endRow = parseInt(_endRow.toString());
//       startColumn = _startColumn!.toString();
//       endColumn = _endColumn!.toString();
    
//       const values = {
//         userEnteredFormat: {
//           textFormat: {
//             fontSize: fontSize,
//             bold: bold,
//             italic: false,
//             underline: false,
//           },
//           horizontalAlignment: horizontalAlignment,
//           verticalAlignment: verticalAlignment,
//           borders: getBordersCell(topBorder, bottomBorder, leftBorder, rightBorder),
//           backgroundColor: getColorCell(color),
//         },
//       };
    
//       const requests = [
//         {
//           updateCells: {
//             rows: Array.from({ length: endRow - startRow + 1 }, () => ({
//               values: Array.from({ length: endColumn.charCodeAt(0) - startColumn.charCodeAt(0) + 1 }, () => ({ userEnteredFormat: values.userEnteredFormat }))
//             })),
//             range: {
//               sheetId: await getSheetId(sheetID),
//               startRowIndex: startRow - 1,
//               endRowIndex: endRow,
//               startColumnIndex: startColumn.charCodeAt(0) - 'A'.charCodeAt(0),
//               endColumnIndex: endColumn.charCodeAt(0) - 'A'.charCodeAt(0) + 1,
//             },
//             fields: 'userEnteredFormat.textFormat,userEnteredFormat.horizontalAlignment,userEnteredFormat.verticalAlignment,userEnteredFormat.borders,userEnteredFormat.backgroundColor',
//           },
//         },
//       ];
      
//       const request = {
//         spreadsheetId,
//         resource: {
//           requests,
//         },
//         auth,
//       };
    
//       try {
//         const response = await sheets.spreadsheets.batchUpdate(request);
//         console.log(`New Style Applied for:` +response.data);
//       } catch (err) {
//         console.error(`Error to Apply Style: ${err}`);
//       }
//     }
//   })

// import { google, sheets_v4 } from "googleapis";
// import { getColorCell, getBordersCell } from "../handlers/sheetStyleHandler";