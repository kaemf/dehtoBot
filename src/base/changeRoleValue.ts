export default function Role(data: string){
    if (data === 'Студент'){
        return 'student';
    }
    else if (data === 'Викладач'){
        return 'teacher';
    }
    else if (data === 'Адмін'){
        return 'admin';
    }
    else return false;
}