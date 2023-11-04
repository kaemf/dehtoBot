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

export function ConvertRole(data: string){
    if (data === 'student'){
        return 'Студент';
    }
    else if (data === 'teacher'){
        return 'Викладач';
    }
    else if (data === 'admin'){
        return 'Адмін';
    }
    else if (data === 'developer'){
        return 'Розробник'
    }
    else return false;
}