import { DateProcessToPresentView } from "../process/dateAndTimeProcess";

export default function checkAvailabilityForLesson(timeInputed: string, dateInputed: string, lessonObjects: any, idTeacher: number, part: string, newDuration?: number) {
    const duration = lessonObjects.duration * 60000;
    let free = false,
      busyBy = '';

    switch(part){
      case "part_1":
        for (let i = 0; i < lessonObjects.length; i++){
          if (lessonObjects[i].idTeacher === idTeacher && lessonObjects[i].date === DateProcessToPresentView(dateInputed)){
            const date = (lessonObjects[i].date).replace(/\./g, '-');
            const lessonTime = new Date(`${date}T${lessonObjects[i].time}`),
              endTime = new Date(lessonTime.getTime() + duration),
              startTime = new Date(lessonTime.getTime() - 1800000),
              timeInputted_ =  new Date(`${date}T${timeInputed}`);

            if (lessonTime <= timeInputted_){
              console.log(`(P1) Trigger on: lessonTime <= timeInputted_`)
              if (endTime <= timeInputted_){
                console.log(`(P1) Trigger on: endTime <= timeInputted_`)
                free = false;
              }
              else{
                free = true;
                console.log(`(P1) Trigger on like else: endTime <= timeInputted_`)
                busyBy = (lessonObjects[i].idStudent).toString();
              }
            }
            else if (lessonTime >= timeInputted_){
              console.log(`(P1) Trigger on: lessonTime >= timeInputted_`)
              if (startTime >= timeInputted_){
                console.log(`(P1) Trigger on: startTime >= timeInputted_`)
                free = false;
              }
              else{
                console.log(`(P1) Trigger on like else: startTime >= timeInputted_`)
                free = true;
                busyBy = (lessonObjects[i].idStudent).toString();
              }
            }
            if (free){
                console.warn(`(P1) Busy: ${busyBy}`);
                console.log(`(P1) Дата и время занятия: ${date} ${lessonObjects[i].time}, \n\n${timeInputted_}`);
                console.log(`(P1) Сколько идет занятие: ${duration / 60000}`);
                console.log(`(P1) EndTime Когда заканчивается занятие (+duration): ${endTime}`);
                console.log(`(P1) StartTime Время начала занятия (-30): ${startTime}`);
                return busyBy;
            }
            else{
                console.warn(`(P1) No Busy`);
                console.log(`(P1) Дата и время занятия: ${date} ${lessonObjects[i].time}, \n\n${timeInputted_}`);
                console.log(`(P1) Сколько идет занятие: ${duration / 60000}`);
                console.log(`(P1) EndTime Когда заканчивается занятие (+duration): ${endTime}`);
                console.log(`(P1) StartTime Время начала занятия (-30): ${startTime}`);
                return 'free';
            }
          }
        }
        if (!free) return 'free';
        break;

      case "part_2":
        if (newDuration === undefined) throw new Error('newDuration is undefined');
        for (let i = 0; i < lessonObjects.length; i++){
          if (lessonObjects[i].idTeacher === idTeacher && lessonObjects[i].date === dateInputed){
            const _date = lessonObjects[i].date.replace(/\./g, '-');
            const newDuration_ = newDuration * 60000,
              _endTime = new Date(new Date(`${_date}T${lessonObjects[i].time}`).getTime() + duration),
              _startTime = new Date(new Date(`${_date}T${lessonObjects[i].time}`).getTime() - newDuration_),
              _lessonTime = new Date(`${_date}T${lessonObjects[i].time}`),
              _timeInputted_ =  new Date(`${_date}T${timeInputed}`);

            if (_lessonTime <= _timeInputted_){
              console.log(`(P2) Trigger on: lessonTime <= timeInputted_`)
              if (_endTime <= _timeInputted_){
                console.log(`(P2) Trigger on: endTime <= timeInputted_`)
                free = false;
              }
              else{
                free = true;
                console.log(`(P2) Trigger on like else: endTime <= timeInputted_`)
                busyBy = (lessonObjects[i].idStudent).toString();
              }
            }
            else if (_lessonTime >= _timeInputted_){
              console.log(`(P2) Trigger on: lessonTime >= timeInputted_`)
              if (_startTime >= _timeInputted_){
                console.log(`(P2) Trigger on: startTime >= timeInputted_`)
                free = false;
              }
              else{
                console.log(`(P2) Trigger on like else: startTime >= timeInputted_`)
                free = true;
                busyBy = (lessonObjects[i].idStudent).toString();
              }
            }
            if (free){
                console.warn(`(P2) Busy: ${busyBy}`);
                console.log(`(P2) Дата и время занятия: ${_date} ${lessonObjects[i].time}, \n\n${_timeInputted_}`);
                console.log(`(P2) Сколько идет занятие: ${duration / 60000}`);
                console.log(`(P2) EndTime Когда заканчивается занятие (+duration): ${_endTime}`);
                console.log(`(P2) StartTime Время начала занятия (-30): ${_startTime}`);
                return busyBy;
            }
            else{
                console.warn(`(P2) No Busy`);
                console.log(`(P2) Дата и время занятия: ${_date} ${lessonObjects[i].time}, \n\n${_timeInputted_}`);
                console.log(`(P2) Сколько идет занятие: ${duration / 60000}`);
                console.log(`(P2) EndTime Когда заканчивается занятие (+duration): ${_endTime}`);
                console.log(`(P2) StartTime Время начала занятия (-30): ${_startTime}`);
                return 'free';
            }
          }
        }
        if (!free) return 'free';
        break;

      default:
        throw new Error('Wrong part parametr');
    }
}