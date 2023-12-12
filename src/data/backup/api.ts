// app.post('/api/sendToTelegram', async (req: Request, res: Response) => {
//   try {
//     const { lang: language} = req.body;

//     if (language === '31843'){
//       let {
//         'Ваше імʼя': UserName,
//         'Ваш телефон': PhoneNumber,
//         'Нік в телеграмі': TGUserName,
//         'Рівень': Level,
//         'Час занять': LessonTime,
//         'День занять': LessonDay,
//       } = req.body;

//       const date = new Date(),
//         formattedDate = DateRecord(),
//         formattedTime = `${date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()}:${date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()}`;

//       await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
//         chat_id: confirmationChat,
//         text: script.apiReport(UserName, PhoneNumber, TGUserName, Level, LessonTime, LessonDay, formattedDate, formattedTime),
//         parse_mode: "HTML"
//       });

//       await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
//         chat_id: supportChat,
//         text: script.apiReport(UserName, PhoneNumber, TGUserName, Level, LessonTime, LessonDay, formattedDate, formattedTime),
//         parse_mode: "HTML"
//       });

//       await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
//         chat_id: devChat,
//         text: script.apiReport(UserName, PhoneNumber, TGUserName, Level, LessonTime, LessonDay, formattedDate, formattedTime),
//         parse_mode: "HTML"
//       });
    
//       console.log("\n\nNew Request For API was sent\n", req.body);
//       res.status(200).json({ message: 'Message successfully sent to Telegram' });
//     }
//     else if (language === '32813'){
//       let {
//         'Ваше имя': UserName,
//         'Ваш телефон': PhoneNumber,
//         'Ник в телеграме': TGUserName,
//         'Уровень': Level,
//         'Время занятий': LessonTime,
//         'День занятий': LessonDay,
//       } = req.body;
    
//       const date = new Date(),
//         formattedDate = DateRecord(),
//         formattedTime = `${date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()}:${date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()}`;

//       await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
//         chat_id: confirmationChat,
//         text: script.apiReport(UserName, PhoneNumber, TGUserName, Level, LessonTime, LessonDay, formattedDate, formattedTime),
//         parse_mode: "HTML"
//       });

//       await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
//         chat_id: supportChat,
//         text: script.apiReport(UserName, PhoneNumber, TGUserName, Level, LessonTime, LessonDay, formattedDate, formattedTime),
//         parse_mode: "HTML"
//       });

//       await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
//         chat_id: devChat,
//         text: script.apiReport(UserName, PhoneNumber, TGUserName, Level, LessonTime, LessonDay, formattedDate, formattedTime),
//         parse_mode: "HTML"
//       });
    
//       console.log("\n\nNew Request For API was sent\n", req.body);
//       res.status(200).json({ message: 'Message successfully sent to Telegram' });
//     }
//     else{
//       const date = new Date(),
//         formattedDate = DateRecord(),
//         formattedTime = `${date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()}:${date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()}`;

//       await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
//         chat_id: confirmationChat,
//         text: script.apiReport('відсутнє', 'відсутній', 'не знайдений', 'не надісланий', 'безлімітний', 'будь коли', formattedDate, formattedTime),
//         parse_mode: "HTML"
//       });

//       await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
//         chat_id: supportChat,
//         text: script.apiReport('відсутнє', 'відсутній', 'не знайдений', 'не надісланий', 'безлімітний', 'будь коли', formattedDate, formattedTime),
//         parse_mode: "HTML"
//       });

//       await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
//         chat_id: devChat,
//         text: script.apiReport('відсутнє', 'відсутній', 'не знайдений', 'не надісланий', 'безлімітний', 'будь коли', formattedDate, formattedTime),
//         parse_mode: "HTML"
//       });
    
//       console.log("\n\nNew Request For API was sent with errors (language trouble)\n\n", req.body);
//       res.status(200).json({ message: 'Message successfully sent to Telegram, but without data (language is not correct)' });
//     }
//   } catch (error) {
//     console.error('Error, detail:', error);
//     res.status(500).json({ error: 'Error to Sent message, Check Console for Detail' });
//   }
// });