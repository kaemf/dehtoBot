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
    // TO DO
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