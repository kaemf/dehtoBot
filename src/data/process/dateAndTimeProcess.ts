function formatDate(date: Date, onlyDayOfWeek?: boolean): string {
    const daysOfWeek = ["нд", "пн", "вт", "ср", "чт", "пт", "сб"],
        months = [
            "січня", "лютого", "березня", "квітня", "травня", "червня",
            "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"
        ],

        dayOfWeek = daysOfWeek[date.getDay()],
        month = months[date.getMonth()],
        day = date.getDate(),
        year = date.getFullYear();

    return !onlyDayOfWeek ? `${day} ${month} (${dayOfWeek}) ${year}` : dayOfWeek;
}

export function getDayOfWeek(date: Date){
    const daysOfWeek = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];

    return daysOfWeek[date.getDay()];
}

export function UniversalSingleDataProcess(date: Date, parametr: string){
    switch(parametr){
        case "day_of_week":
            return getDayOfWeek(date).toLowerCase().toString();

        case "month":
            const months = [
                "січня", "лютого", "березня", "квітня", "травня", "червня",
                "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"
            ];

            return months[date.getMonth()].toString();

        case "day":
            return date.getDate().toString();

        case "year":
            return date.getFullYear().toString();

        default:
            throw new Error('\n\nUncorrect parametr get in UniversalSingleDataProcess()');
    }
}

export function DateProcess(dateString: string){
    const dateSplitted = dateString.replace(/[^\d.]/g, '').split('.').map(component => component.trim()),
        isValidDate = /^[0-9]{2}$/.test(dateSplitted[0]) && /^[0-9]{2}$/.test(dateSplitted[1]) && /^[0-9]{4}$/.test(dateSplitted[2]);

    if (isValidDate){
        const dateCheck = new Date(
            parseInt(dateSplitted[2], 10), 
            parseInt(dateSplitted[1], 10) - 1,
            parseInt(dateSplitted[0], 10)
        );
        
        return !isNaN(dateCheck.getTime()) ? [ formatDate(dateCheck), `${dateSplitted[2]}.${dateSplitted[1]}.${dateSplitted[0]}` ] : [ 'date_uncorrect' ];
    }
    else return [ 'format_of_date_uncorrect' ];
}

export function TimeProcess(timeString: string){
    const dateTimeSplitted = timeString.replace(/[^\d:]/g, '').split(':').map(component => component.trim()),
        isValidTime = dateTimeSplitted.length === 2 && /^[0-9]{1,2}$/.test(dateTimeSplitted[0]) && /^[0-9]{1,2}$/.test(dateTimeSplitted[1]);

    if (isValidTime) {
        const hours = parseInt(dateTimeSplitted[0], 10),
            minutes = parseInt(dateTimeSplitted[1], 10);

        return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60
        ?
        `${hours < 10 ? '0' +hours : hours}:${minutes < 10 ? '0' + minutes : minutes}`
        :
        'time_uncorrect';
    }
    else return 'format_of_time_uncorrect';
}

export function DateProcessToPresentView(dateString: string){
    const dateSplitted = dateString.split('.'),
    isValidDate = /^[0-9]{4}$/.test(dateSplitted[0]) && /^[0-9]{2}$/.test(dateSplitted[1]) && /^[0-9]{2}$/.test(dateSplitted[2]);

    if (isValidDate){
        const dateCheck = new Date(
            parseInt(dateSplitted[2], 10), 
            parseInt(dateSplitted[1], 10) - 1,
            parseInt(dateSplitted[0], 10)
        );
        
        return !isNaN(dateCheck.getTime()) ? [ formatDate(dateCheck, true), `${dateSplitted[2]}.${dateSplitted[1]}.${dateSplitted[0]}` ] : [ 'date_uncorrect' ];
    }
    else return [ 'format_of_date_uncorrect' ];
}

export function SortSchedule(lessons: any[]){
    return lessons.sort((a, b) => {
        const dateA = new Date(a!.date);
        const dateB = new Date(b!.date);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        
        const timeA = a!.time.split(':').map(Number);
        const timeB = b!.time.split(':').map(Number);
        
        if (timeA[0] !== timeB[0]) {
            return timeA[0] - timeB[0];
        } else {
            return timeA[1] - timeB[1];
        }
    })
}

export function formatDateWithTime(date: Date): string {
    const daysOfWeek = ["нд", "пн", "вт", "ср", "чт", "пт", "сб"],
        months = [
            "січня", "лютого", "березня", "квітня", "травня", "червня",
            "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"
        ],

        dayOfWeek = daysOfWeek[date.getDay()],
        month = months[date.getMonth()],
        day = date.getDate(),
        year = date.getFullYear(),
        hours = date.getHours().toString().padStart(2, '0'),
        minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day} ${month} (${dayOfWeek}) ${year}, ${hours}:${minutes}`;
}

export function isDateNoInPast(date: string){
    const inputDate = new Date(date.replace(/\./g, '-'));
    const currentDate = new Date();
    
    // Устанавливаем время для обеих дат в 00:00:00:000
    inputDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    // Сравниваем даты без времени
    return inputDate >= currentDate;
}

export function isTimeNotInPast(date: string, time: string): boolean {
    const currentTime = new Date();
    const inputTime = new Date(date.replace(/\./g, '-') + 'T' + time);

    return inputTime > currentTime;
}
