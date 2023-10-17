export type UserScriptState =
  | "WaitingForName"
  | "ChoosingCourses"
  | "AdditionalQuestions"
  | "AnswerForAdditionalQuestions"
  | "HaveAdditionalQuestion"
  | "WaitingForPayment"
  | "AskingForPhoneNumber"
  | "FunctionRoot"
  | "GraphicRespondAndLevelRequest"
  | "LevelRespondAndRequestQuestions"
  | "EndRootManager"
  | "GetQuestionsAndSendData"
  | "RespondPacketAndGetPayment"
  | "RespondPaymentAndSendData"
  | "_GraphicRespondAndLevelRequest"
  | "_LevelRespondAndRequestQuestions"
  | "_GetQuestionsAndSendData"
  | "TrialLessonQuestionsManager"
  | "RespondCourseAndGetPacket"
  | "ActionClubRespondAndRootAction"
  | "RespondChooseAndRespondGetLesson"
  | "RespondCheckLessonsAndGetLessons"
  | "RespondTypePacketAndGetPayment"
  | "RespondPaymentAndGetCourseOrFinal"
  | "RespondCourseAndGetMail"
  | "RespondMailAndFinal"
  | "RespondAdminActionAndRootChoose"
  | "ADD_RespondTitleAndGetTeacher"
  | "ADD_RespondTeacherAndGetDate"
  | "ADD_RespondDateAndGetTime"
  | "ADD_RespondTimeAndGetCount"
  | "ADD_RespondCountAndGetLink"
  | "ADD_RespondLinkAndCheckRight"
  | "ADD_CheckHandlerAndRoot"
  | "DeleteHandlerAndRoot"
  | "RespondKeyDataAndGetChanges"
  | "GetChangesAndChangeThis"
  | "ChangeThisAndReturn"