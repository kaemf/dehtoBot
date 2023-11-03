export default function Key(data: string){
    if (data === 'Тема'){
        return 'title';
    }
    else if (data === 'Викладач'){
        return 'teacher';
    }
    else if (data === 'Дата'){
        return 'date';
    }
    else if (data === 'Час'){
        return 'time';
    }
    else if (data === 'Місця'){
        return 'count';
    }
    else if (data === 'Посилання'){
        return 'link';
    }
    else return null;
}