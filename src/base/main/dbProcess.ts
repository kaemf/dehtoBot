import { MongoClient, ObjectId } from "mongodb";
import { Telegram } from "telegraf";
import { UniversalSingleDataProcess, formatDateWithTime } from "../../data/process/dateAndTimeProcess"
import script from "../../data/general/script";
process.env.TZ = 'Europe/Kiev';

export default async function dbProcess(botdb: MongoClient){
    class DBProcess {
        private clubdbLessons = botdb.db('dehtoBDB').collection('clubLessons');
        private botdbUsers = botdb.db('dehtoBDB').collection('dataUsers');
        private deTaskDB = botdb.db('dehtoBDB').collection('deTask');
        private individualdbLessons = botdb.db('dehtoBDB').collection('individualLessons');
        private liveSupport = botdb.db('dehtoBDB').collection('supportActiveChannels');
        private sentIndividualNotifications = botdb.db('dehtoBDB').collection('sentNotificationIndividualLessons');

        async ShowAll() {
            return await this.clubdbLessons.find({}).toArray();
        }

        async ShowAllInvdividualLessons() {
            return await this.individualdbLessons.find({}).toArray();
        }

        async AddData(data: {title: string, teacher: string, date: string, time: string, count: number, link: string}) {
            return await this.clubdbLessons.insertOne(data);
        }

        async DeleteData(id: ObjectId) {
            await this.clubdbLessons.deleteOne({ _id: new ObjectId(id) });
        }

        async ChangeKeyData(id: Object, key: string, value: string | number | string[] | number[], isClubDB: boolean){
            const updateObject = { $set: {} } as { $set: { [key: string]: string | number | string[] | number[] } };
            updateObject.$set[key] = value;

            isClubDB ? await this.clubdbLessons.updateOne(id, updateObject) : await this.botdbUsers.updateOne(id, updateObject);
        }

        async ShowData(id: ObjectId) {
            return await this.clubdbLessons.findOne({ _id: new ObjectId(id) });
        }

        async GetObject(id: ObjectId) {
            return this.clubdbLessons.find({ _id: new ObjectId(id) });
        }

        async ShowAllUsers() {
            return await this.botdbUsers.find({}).toArray();
        }

        async AddUser(data : {id: number, name: string, number: string, username: string, role: string, count: number}) {
            await this.botdbUsers.insertOne(data);
        }

        async DeleteUser(id: string) {
            await this.botdbUsers.updateOne({ id: id }, {$set: {teacher: false, role: 'guest'}});
        }

        async ShowOneUser(id: number) {
            return await this.botdbUsers.findOne({ id: id });
        }

        async ChangeCountUser(id: ObjectId, newValue: number){
            const updateObject = {$set: {count: newValue}};

            await this.botdbUsers.updateOne({_id: id}, updateObject);
        }

        async ChangeUserName(id: ObjectId, name: string){
            const updateObject = {$set : {
            name : name
            }}

            await this.botdbUsers.updateOne({_id: id}, updateObject);
        }

        async UpdateUserData(id: ObjectId, number: string, username: string){
            const updateObject = {$set : {
                number: number,
                username: username
            }}

            await this.botdbUsers.updateOne({_id: id}, updateObject);
        }

        async WriteNewClubToUser(idUser: number, idClub: ObjectId){
            const user = await this.ShowOneUser(idUser),
                data = user!.recordClubs !== undefined ? user!.recordClubs.toString() : false;

            if (data){
                const dataContain = data.split(',');

                if (data.indexOf(idClub.toString()) === -1){
                    dataContain.push(idClub);
            
                    const updateObject = {$set : {
                    recordClubs: dataContain.join(',')
                    }}
            
                    await this.botdbUsers.updateOne({_id: user!._id}, updateObject);
                }
                else return false;
            }
            else{
                const updateObject = {$set : {
                    recordClubs: idClub
                }}

                await this.botdbUsers.updateOne({_id: user?._id}, updateObject);
            }
        }

        async HasThisClubUser(idUser: number, idClub: ObjectId){
            const user = await this.ShowOneUser(idUser),
                data = user && user!.recordClubs !== undefined &&  user!.recordClubs !== null ? user!.recordClubs.toString() : false;

            if (data) return data.indexOf(idClub.toString()) === -1 ? false : true;
            else return false;
        }

        async DeleteClubFromUser(idUser: number, idClub: ObjectId){
            const user = await this.ShowOneUser(idUser),
                data = user!.recordClubs !== undefined ? user!.recordClubs.toString().split(',') : false;
            
            if (data){
                const indexInMassive = data.indexOf(idClub.toString());

                if (indexInMassive !== -1){
                    data.splice(indexInMassive, 1);

                    const updateObject = {$set : {
                        recordClubs: data.join(',')
                    }}

                    await this.botdbUsers.updateOne({_id: user?._id}, updateObject);
                }
            }
        }

        async SetMailForUser(idUser: number, mail: string){
            const user = await this.ShowOneUser(idUser),
                emailCheck = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            
            if (emailCheck.test(mail)){
                const updateObject = {$set : {
                    email: mail
                }}

                await this.botdbUsers.updateOne({_id: user?._id}, updateObject); 
                return true;
            }
            else return false;
        }

        async SwitchToCompletTrialLesson(idUser: number, haveTrialLessonClub: string){
            const user = await this.ShowOneUser(idUser);
            
            const updateObject = {$set : {
                haveTrialLessonClub: haveTrialLessonClub
            }}
            
            await this.botdbUsers.updateOne({_id: user?._id}, updateObject);
        }

        async ChangeUserRole(idUser: number, newRole: string){
            const user = await this.ShowOneUser(idUser);

            if (newRole === 'student' || newRole === 'teacher' || newRole === 'admin'){
                const updateObject = {$set : {
                    role: newRole
                }}

                await this.botdbUsers.updateOne({_id: user?._id}, updateObject);

                return true;
            }
            else return false;
        }

        async CheckActiveOnClub(idUser: number){
            const user = await this.ShowOneUser(idUser);

            return user!.activeOnClub ? true : false;
        }

        async SetActiveOnClub(idUser: number){
            const user = await this.ShowOneUser(idUser);

            const updateObject = {$set : {
                activeOnClub: 'true'
            }}

            await this.botdbUsers.updateOne({_id: user?._id}, updateObject);
        }

        async GetTeacherBool(name: string){
            const haveTeacher = await this.botdbUsers.findOne({ name: name });

            return haveTeacher ? true : false;
        }

        async GetTeacherNameAndID(name: string, choose: boolean){
            const teacher = await this.botdbUsers.findOne({ name: name });

            return choose ? [teacher!.name, teacher!.id] : teacher!.id;
        }

        private isTimeExpired(deleteAt: Date): boolean {
            return deleteAt < new Date();
        }

        getDateClub(date: Date): string {
            const daysOfWeek = ["нд", "пн", "вт", "ср", "чт", "пт", "сб"],
                months = [
                    "січня", "лютого", "березня", "квітня", "травня", "червня",
                    "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"
                ],
        
                dayOfWeek = daysOfWeek[date.getDay()],
                month = months[date.getMonth()],
                day = date.getDate();
        
            return `${day} ${month} (${dayOfWeek})`;
        }
        
        async DeleteExpiredClubs() {
            const clubs = await this.ShowAll(),
                users = await this.ShowAllUsers();

            for(let i = 0; i < clubs.length; i++){
                if (this.isTimeExpired(new Date(`${clubs[i].date.replace(/\./g, '-')}T${clubs[i].time}`))){
                    console.log('\nFounded Expired Club And Deleted\n')
                    this.DeleteData(clubs[i]._id);
                    for (let j = 0; j < users.length; j++){
                        this.DeleteClubFromUser(users[j].id, clubs[i]._id);
                    }
                }
            }
        }

        async DeleteExpiredIndividualLessons() {
            const lessons = await this.individualdbLessons.find({}).toArray();

            for(let i = 0; i < lessons.length; i++){
                if (this.isTimeExpired(new Date(`${lessons[i].date.replace(/\./g, '-')}T${lessons[i].time}`))){
                    if (lessons[i].type === 'trial'){
                        const teacher = await this.ShowOneUser(lessons[i].idTeacher),
                            student = await this.ShowOneUser(lessons[i].idStudent);

                        if (teacher){
                            const trial_students = teacher.trial_students?.length ? teacher.trial_students : false;

                            if (trial_students && trial_students.includes(lessons[i].idStudent) && student){
                                await this.botdbUsers.updateOne({_id: teacher._id}, {$set: {trial_students: trial_students.filter((id: any) => id !== lessons[i].idStudent)}});
                                await this.botdbUsers.updateOne({_id: student._id}, {$set: {trial: true}});
                            }
                        }
                        await this.SystemDeleteIndividualLesson(lessons[i]._id);
                    }
                    else{
                        const teacher = await dbProcess.ShowOneUser(lessons[i].idTeacher);
    
                        if (teacher){
                            const student = await dbProcess.ShowOneUser(lessons[i].idStudent),
                                set_individual_lessons = teacher.set_individual_lessons?.length ? teacher.set_individual_lessons : false,
                                individual_lessons = student?.individual_lessons?.length ? student.individual_lessons : false,
                                string_individual_lessons = set_individual_lessons.map((element: any) => {
                                    return element.toString();
                                }),
                                string_individual_lessons_student = individual_lessons.map((element: any) => {
                                    return element.toString();
                                }),
                                indexElementTeacher = string_individual_lessons?.indexOf(lessons[i]._id.toString()),
                                indexElementStudent = string_individual_lessons_student?.indexOf(lessons[i]._id.toString());
        
                            if (indexElementTeacher !== -1) set_individual_lessons.splice(indexElementTeacher, 1);
                            if (indexElementStudent !== -1) individual_lessons.splice(indexElementStudent, 1);
                            await this.botdbUsers.updateOne({id: teacher.id}, {$set: {set_individual_lessons: set_individual_lessons}});
                            await this.botdbUsers.updateOne({id: student!.id}, {$set: {individual_lessons: individual_lessons}});
                            console.log('\nFounded Expired Individual Lessson and Delete\n')
                            await this.SystemDeleteIndividualLesson(lessons[i]._id);
                        }
                    }
                }
            }
        }

        isValidInput(inputStr: string, year: boolean): boolean {
            if (year){
                const regex = /^\d{4}$/;
                return regex.test(inputStr);
            }
            else{
                const regex = /^\d{2}$/;
                return regex.test(inputStr);
            }
        }

        async getUserActiveClubs(idUser: number){
            const user = await this.ShowOneUser(idUser),
                data = user!.recordClubs !== undefined ? user!.recordClubs.toString() : false;

            return data ? data.split(',') : false;
        }

        async GetTeacherStudents(id: number){
            const teacher = await this.ShowOneUser(id);

            return teacher!.my_students;
        }

        async WriteNewDeTask(idTeacher: number, idStudent: number, content: string[] | boolean, files: string[] | boolean, typeOfFiles: string[] | boolean){
            let tasksIDsForStudent: ObjectId,
                tasksIDsForTeacher: ObjectId[];
            const student = await this.ShowOneUser(idStudent),
                teacher = await this.ShowOneUser(idTeacher),
                document = await this.deTaskDB.insertOne({
                    idTeacher: idTeacher,
                    idStudent: idStudent,
                    content: content,
                    files: files,
                    typeOfFiles: typeOfFiles,
                    answer: false,
                    answerFiles: false,
                    answerTypeOfFiles: false
                })

            if (student && student.detask){
                await this.deTaskDB.deleteOne({_id: student.detask});
            }

            tasksIDsForStudent = document.insertedId;

            if (teacher && teacher.set_detasks){
                tasksIDsForTeacher = teacher.set_detasks;
                const tasksIDsForTeacherString = teacher.set_detasks.map((element: any) => {
                    return element.toString();
                });

                if (tasksIDsForTeacherString.includes(student!.detask?.toString())){
                    console.warn(true)
                    const index = tasksIDsForTeacherString.indexOf(student!.detask?.toString());
                    tasksIDsForTeacher.splice(index, 1);
                }
                tasksIDsForTeacher.push(document.insertedId);
            }
            else tasksIDsForTeacher = [ document.insertedId ];

            await this.botdbUsers.updateOne({id: idStudent}, {$set : {detask: tasksIDsForStudent}})
            await this.botdbUsers.updateOne({id: idTeacher}, {$set : {set_detasks: tasksIDsForTeacher}})
        }

        async WriteAnswerToDeTask(id: ObjectId, content: string[] | boolean, files: string[] | boolean, typeOfFiles: string[] | boolean){
            const deTask = await this.GetDeTaskForStudent(id);
            let updateObjectDeTask = {};

            if (deTask){
                updateObjectDeTask = {$set : {
                    answer: content,
                    answerFiles: files,
                    answerTypeOfFiles: typeOfFiles
                }}

                await this.deTaskDB.updateOne({_id: id}, updateObjectDeTask);
            }
            else throw new Error(`\n\nError: Can't find deTask with id (${id})`);
        }

        async GetStudentAnswerForDeTask(idStudent: number){
            const student = await this.ShowOneUser(idStudent),
                deTaskStudentID = student ? student.detask : false,
                deTask = await this.GetDeTaskForStudent(deTaskStudentID);

            if (student){
                if (deTask){
                    if (deTask.answer || (deTask.answerFiles && deTask.answerTypeOfFiles)){
                    return [ 
                        deTask.answer || false, 
                        deTask.answerFiles || false,
                        deTask.answerTypeOfFiles || false 
                    ];
                    }
                    else return [ 'no_answer_available' ];
                }
                else return [ 'no_task_available' ];
            }
            else throw new Error(`\n\nError: Can't find user for get task answer. User id: ${idStudent}`);
        }

        async GetUserIDByName(name: string){
            const user = await this.botdbUsers.findOne({ name: name });

            return user ? user.id : false;
        }
        
        async GetDeTaskForStudent(taskID: ObjectId){
            return await this.deTaskDB.findOne({_id: taskID});
        }
        
        private async GetUserIDByPhoneNumber(number: string){
            const user = await this.botdbUsers.findOne({number: number});

            return user ? user.id : false;
        }

        private async GetUserIDByTG(tg: string){
            const user = await this.botdbUsers.findOne({username: tg});

            return user ? user.id : false;
        }

        async FindUser(answer: string): Promise<any>{
            const idCheck = parseInt(answer[0]) ? parseInt(answer) : false,
                userIDByName = await this.GetUserIDByName(answer),
                userIDByTG = await this.GetUserIDByTG(answer.slice(1));

            let userObjectByID, userObjectByName, userObjectByNumber, userObjectByTG, userIDByNumber;

            if (answer[0] === '+'){
                userIDByNumber = await this.GetUserIDByPhoneNumber(answer) ? await this.GetUserIDByPhoneNumber(answer) : await this.GetUserIDByPhoneNumber(answer.slice(1));
            }
            else userIDByNumber = await this.GetUserIDByPhoneNumber(answer) ? await this.GetUserIDByPhoneNumber(answer) : await this.GetUserIDByPhoneNumber(`+${answer}`);
            
            userObjectByID = idCheck ? await this.ShowOneUser(idCheck) : false;
            userObjectByName = userIDByName ? await this.ShowOneUser(userIDByName) : false;
            userObjectByNumber = userIDByNumber ? await this.ShowOneUser(userIDByNumber) : false;
            userObjectByTG = userIDByTG ? await this.ShowOneUser(userIDByTG) : false;

            if (userObjectByID){
                return userObjectByID;
            }
            else if (userObjectByName){
                return userObjectByName;
            }
            else if (userObjectByNumber){
                return userObjectByNumber;
            }
            else if (userObjectByTG){
                return userObjectByTG;
            }
            else return false;
        }

        async DeleteDeTask(taskID: ObjectId){
            const deTask = await this.GetDeTaskForStudent(taskID),
                userWithTask = await this.ShowOneUser(deTask ? deTask.idStudent : ''),
                teacherWithTask = await this.ShowOneUser(deTask ? deTask.idTeacher : ''),
                teacherTasks = teacherWithTask ? teacherWithTask.set_detasks : false;

            let teacherTasksStringVersion = [];

            if (teacherTasks){
                for (let i = 0; i < teacherTasks.length; i++){
                    teacherTasksStringVersion.push(teacherTasks[i].toString());
                }

                const indexInMassive = teacherTasksStringVersion.indexOf(taskID.toString());

                if (indexInMassive !== -1){
                    teacherTasks.splice(indexInMassive, 1);

                    const updateObjectTeacher = {$set : {
                        set_detasks: teacherTasks
                    }}

                    await this.botdbUsers.updateOne({_id: userWithTask?._id}, updateObjectTeacher);
                    await this.deTaskDB.deleteOne({_id: taskID});
                }
                else throw new Error('\n\ndeTask Not Found to Delete and to Delete for User');
            }
        }

        async IndividualChangeUserData(idStudent: number, parametr: string, value: string | number){
            const user = await this.ShowOneUser(idStudent);
            let updateObject = {}

            if (user){
                switch (parametr) {
                    case "individual_count":
                        updateObject = {$set :{
                            individual_count: value
                        }}
                        await this.botdbUsers.updateOne({_id: user._id}, updateObject)
                        break;
                    
                    case "miro_link":
                        updateObject = {$set :{
                            miro_link: value
                        }}
                        await this.botdbUsers.updateOne({_id: user._id}, updateObject)
                        break;

                    case "translate_to_another_teacher":
                        const usersTeacher = await this.ShowOneUser(user.teacher),
                            newTeacher = await this.ShowOneUser(await this.GetUserIDByName(value.toString()));

                        if (usersTeacher && newTeacher){
                            const oldTeacherStudents = usersTeacher.registered_students,
                                newTeacherStudents = newTeacher.registered_students ?? false,
                                studentDeTask = await this.deTaskDB.findOne({idStudent: user.id}) || false,
                                indexInMassiveOld = oldTeacherStudents.indexOf(user.id),
                                studentsLessons = user.individual_lessons,
                                oldTeachersLessons = usersTeacher.set_individual_lessons;

                            if (oldTeachersLessons && oldTeacherStudents.length){
                                const stringOldTeachersLessons = oldTeachersLessons.map((element: any) => {
                                    return element.toString()
                                }), stringUserLessons = studentsLessons.map((element: any) => {
                                    return element.toString();
                                })

                                for (let i = 0; i < stringUserLessons.length; i++){
                                    const lesson = await this.individualdbLessons.findOne({_id: new ObjectId(stringUserLessons[i])}),
                                        lessonDuration = lesson?.duration;

                                    if (stringOldTeachersLessons.includes(stringUserLessons[i])){
                                        const indexInUserLessons = stringUserLessons.indexOf(stringUserLessons[i]),
                                            indexInTeacherLessons = stringOldTeachersLessons.indexOf(stringUserLessons[i]);

                                        if (indexInUserLessons !== -1){
                                            studentsLessons.splice(indexInUserLessons, 1);
                                            await this.botdbUsers.updateOne({id: user.id}, {$set: {individual_lessons: studentsLessons}});
                                            const finalCount = parseInt(user.individual_count) + parseInt(lessonDuration);
                                            await this.botdbUsers.updateOne({id: user.id}, {$set: {individual_count: finalCount}});
                                        }
                                        else throw new Error('While transfer user not found lesson which in teacher');

                                        if (indexInTeacherLessons !== -1){
                                            oldTeachersLessons.splice(indexInTeacherLessons, 1);
                                            await this.botdbUsers.updateOne({id: user.teacher}, {set_individual_lessons: oldTeachersLessons});
                                        }

                                        await this.individualdbLessons.deleteOne({_id: lesson!._id});
                                    }
                                }
                            }

                            if (studentDeTask){
                                await this.botdbUsers.updateOne({id: idStudent}, {$set: {detask: false}});
                                await this.deTaskDB.deleteOne({_id: studentDeTask._id});
                                const teacherDeTasks = usersTeacher.set_detasks,
                                    stringTeacherDeTasks = teacherDeTasks.map((element: any) => {
                                        return element.toString();
                                    }),
                                    indexInMassiveTeacher = stringTeacherDeTasks.indexOf(studentDeTask._id.toString());

                                if (indexInMassiveTeacher !== -1){
                                    teacherDeTasks.splice(indexInMassiveTeacher, 1);
                                    await this.botdbUsers.updateOne({id: usersTeacher.id}, {$set: {set_detasks: teacherDeTasks}});
                                }
                                else throw new Error('DeTask not found in teacher');
                            }
                            else console.warn('While transfering to new teacher, detask not found');

                            if (oldTeacherStudents.includes(user.id)){
                                oldTeacherStudents.splice(indexInMassiveOld, 1);

                                const updateObjectTeacher = {$set : {
                                    registered_students: oldTeacherStudents
                                }}

                                await this.botdbUsers.updateOne({_id: usersTeacher._id}, updateObjectTeacher);
                            }
                            else throw new Error('User not found in old Teacher');

                            if (newTeacherStudents){
                                if (!newTeacherStudents.includes(user.id)){
                                    newTeacherStudents.push(user.id);
    
                                    const updateObjectTeacher = {$set : {
                                        registered_students: newTeacherStudents
                                    }}
    
                                    await this.botdbUsers.updateOne({_id: newTeacher._id}, updateObjectTeacher);
                                    await this.botdbUsers.updateOne({_id: user._id}, {$set: {teacher: newTeacher.id}});
                                }
                                else throw new Error('New Teacher already have this student');
                            }
                            else{
                                await this.botdbUsers.updateOne({_id: newTeacher._id}, {$set: {registered_students: [user!.id]}});
                                await this.botdbUsers.updateOne({_id: user._id}, {$set: {teacher: newTeacher.id}});
                            }
                        }
                        else{
                            const newTeacher = await this.ShowOneUser(await this.GetUserIDByName(value.toString())),
                                newTeacherStudents = newTeacher!.registered_students;

                            if (!newTeacherStudents.includes(user.id) && newTeacher){
                                let ifEmpty = [];
                                newTeacherStudents ? newTeacherStudents.push(user!.id) : ifEmpty.push(user!.id);

                                const updateObjectTeacher = {$set : {
                                    registered_students: !newTeacherStudents ? ifEmpty : newTeacherStudents
                                }}

                                await this.botdbUsers.updateOne({_id: newTeacher._id}, updateObjectTeacher);
                                await this.botdbUsers.updateOne({_id: user._id}, {$set: {teacher: newTeacher.id}})
                            }
                            else throw new Error('\n\nNew Teacher already have this student');
                        }
                        break;

                    case "delete_student":
                        const currentTeacher = await this.ShowOneUser(user.teacher);

                        if (currentTeacher){
                            const currentStudents = currentTeacher.registered_students,
                                indexInMassiveOld = currentStudents.indexOf(user.id);

                            if (indexInMassiveOld !== -1){
                                currentStudents.splice(indexInMassiveOld, 1);

                                const updateObjectTeacher = {$set : {
                                    registered_students: currentStudents
                                }}

                                await this.botdbUsers.updateOne({_id: currentTeacher._id}, updateObjectTeacher);
                            }
                            console.log('nUser not found in Teacher');
                            await this.botdbUsers.updateOne({_id: user._id}, {$set: {teacher: false, role: 'guest'}});
                        }
                        return currentTeacher;

                    default:
                        throw new Error('Uncorrect parametr in IndividualChangeUserData()');
                }
            }
            else throw new Error('User not found in IndividualChangeUserData()');
        }

        async DeleteTeacherFromPost(idTeacher: number){
            const teacherObject = await dbProcess.ShowOneUser(idTeacher),
                teacherDetasks = teacherObject?.set_detasks,
                teacherIndividualLessons = teacherObject?.set_individual_lessons;

            if (teacherObject){
                if (teacherIndividualLessons){
                    for (let i = 0; i < teacherIndividualLessons.length; i++){
                        const lesson = await this.individualdbLessons.findOne({_id: teacherIndividualLessons[i]}),
                            student = lesson!.idStudent,
                            finalCount = parseInt(student.individual_count) + parseInt(lesson!.duration),
                            studentLessons = student.individual_lessons,
                            stringIndividualLessons = studentLessons.map((element: any) => {
                                return element.toString();
                            }),
                            indexOfLessonsInStudent = stringIndividualLessons.indexOf(teacherIndividualLessons[i].toString());

                        studentLessons.splice(indexOfLessonsInStudent, 1);
                        await this.botdbUsers.updateOne({id: student.id}, {$set: {individual_lessons: studentLessons, individual_count: finalCount}});
                        await this.individualdbLessons.deleteOne({_id: teacherIndividualLessons[i]});
                    }
                }
                await this.botdbUsers.updateMany({teacher: idTeacher}, {$set: {teacher: false, detask: false}});
                await this.botdbUsers.updateOne({id: idTeacher}, {$set : {registered_students: [], role: 'guest', set_detasks: [], set_individual_lessons: []}});
                if (teacherDetasks){
                    for (let i = 0; i < teacherDetasks.length; i++){
                        const deTask = await this.deTaskDB.findOne({_id: teacherDetasks[i]});
                        await this.deTaskDB.deleteOne({_id: teacherDetasks[i]});
                        await this.botdbUsers.updateOne({id: deTask!.idStudent}, {$set: {detask: false}})
                    }
                }
                return true;
            }
            else return false;
        }

        async UsersOperationWithGuest(idStudent: number, idTeacher: number, miro_link: string, count: number, parametr: string){
            const student = await this.ShowOneUser(idStudent),
                teacher = await this.ShowOneUser(idTeacher);

            if (student && teacher){
                const teachersStudents = teacher.registered_students,
                    trialStudents = teacher.trial_students;
                let teachersStudentsPush = [], trialStudentsPush = [];

                switch(parametr){
                    case "trial_teacher":
                        await this.ChangeKeyData(student, 'miro_link', miro_link, false);
                        if (trialStudents && trialStudents.length){
                            trialStudents.push(student.id)
                            trialStudentsPush = trialStudents;
                        }
                        else trialStudentsPush = [ student.id ];
                        
                        await this.botdbUsers.updateOne({_id: teacher._id}, {$set: {
                            trial_students: trialStudentsPush
                        }})
                        break;

                    case "just_teacher":
                        await this.botdbUsers.updateOne({_id: student._id}, {$set: {
                            teacher: teacher.id,
                            miro_link: miro_link,
                            individual_count: count,
                            role: 'student'
                        }})
                        if (teachersStudents && teachersStudents.length){
                            teachersStudents.push(student.id);
                            teachersStudentsPush = teachersStudents;
                        }
                        else teachersStudentsPush = [ student.id ];
                        
                        await this.botdbUsers.updateOne({_id: teacher._id}, {$set: {
                            registered_students: teachersStudentsPush
                        }})
                        break;

                    default:
                        throw new Error('\n\nUncorrect parametr in UsersOperationWithGuest()');
                }
            }
        }

        async CreateNewIndividualLesson(idStudent: number, idTeacher: number, date: string, time: string, duration: number){
            const student = await this.ShowOneUser(idStudent),
                teacher = await this.ShowOneUser(idTeacher);

            if (student && teacher){
                const teachersStudents = teacher?.registered_students ?? false;
                let teacherHaveThisStudent = false;
                if (teachersStudents){
                    for (let i = 0; i < teachersStudents.length; i++){
                        if (teachersStudents[i] === student.id){
                            teacherHaveThisStudent = true;
                            break;
                        }
                    }
                    if (teacherHaveThisStudent){
                        if (new Date(`${date}T${time}`)){
                            if (duration === 60 || duration === 90 || duration === 30){
                                let lessonPush = [], lessonTeacherPush = [], actualMCount;

                                if (student.individual_count - duration >= 0){
                                    actualMCount = student.individual_count - duration;
                                }
                                else return 'not_enough_minutes';

                                const lesson = await this.individualdbLessons.insertOne({
                                    idStudent: idStudent,
                                    idTeacher: idTeacher,
                                    type: "classic",
                                    date: date,
                                    time: time,
                                    duration: duration
                                });

                                if (student.individual_lessons){
                                    lessonPush = student.individual_lessons;
                                    lessonPush.push(lesson.insertedId);
                                }
                                else lessonPush = [ lesson.insertedId ];

                                if (teacher.set_individual_lessons){
                                    lessonTeacherPush = teacher.set_individual_lessons;
                                    lessonTeacherPush.push(lesson.insertedId);
                                }
                                else lessonTeacherPush = [ lesson.insertedId ];

                                await this.botdbUsers.updateOne({id: idStudent}, {$set: {individual_lessons: lessonPush, individual_count: actualMCount}})
                                await this.botdbUsers.updateOne({id: idTeacher}, {$set: {set_individual_lessons: lessonTeacherPush}});

                                return 'success';
                            }
                            else throw new Error(`Duration entered is uncorrect (${duration})`);
                        }
                        else throw new Error(`Date is uncorrect. ${date} and ${time}.\n\nIn system view is ${new Date(`${date}T${time}`)}`);
                    }
                    else throw new Error(`Teacher haven't student ${student.name}`);
                }
                else throw new Error(`Teacher haven't any student`);
            }
            else throw new Error('Error: can`t find student or teacher in CreateNewIndividualLesson function');
        }

        async EditExistIndividualLesson(id: ObjectId, date: string, time: string, duration?: number){
            const lesson = await this.individualdbLessons.findOne({_id: id});
                let result;

            if (lesson){
                const student = await this.ShowOneUser(lesson.idStudent);

                if (lesson.type === 'trial'){
                    await this.individualdbLessons.updateOne({_id: id}, {$set: {
                        date: date,
                        time: time
                    }});
                    await this.sentIndividualNotifications.deleteOne({id: lesson._id});
                    return true;
                }
                if (lesson.duration > duration!){
                    const different = lesson.duration - duration!;
                    result = parseInt(student!.individual_count + different);
                    if (result < 0){
                        return false;
                    }
                    else{
                        await this.individualdbLessons.updateOne({_id: id}, {$set: {
                            date: date,
                            time: time,
                            duration: duration!
                        }});
                        await this.sentIndividualNotifications.deleteOne({id: lesson._id});
                        await this.botdbUsers.updateOne({id: student!.id}, {$set: { individual_count: result }});
                        return true;
                    }
                }
                else if (lesson.duration === duration!){
                    await this.individualdbLessons.updateOne({_id: id}, {$set: {
                        date: date,
                        time: time
                    }});
                    await this.sentIndividualNotifications.deleteOne({id: lesson._id});
                    return true;
                }
                else if (lesson.duration < duration!){
                    const different = duration! - lesson.duration;
                    result = student!.individual_count - different;
                    if (result < 0){
                        return false;
                    }
                    else{
                        await this.individualdbLessons.updateOne({_id: id}, {$set: {
                            date: date,
                            time: time,
                            duration: duration!
                        }});
                        await this.sentIndividualNotifications.deleteOne({id: lesson._id});
                        await this.botdbUsers.updateOne({id: student!.id}, {$set: { individual_count: result }});
                        return true;
                    }
                }
            }
            else throw new Error('\n\nLesson to edit not found');
        }

        private async SystemDeleteIndividualLesson(id: ObjectId){
            const lesson = await this.individualdbLessons.findOne({_id: id});

            if (lesson){
                await this.individualdbLessons.deleteOne({_id: id});
            }
            else throw new Error('\n\nLesson not found in SystemDeleteIndividualLesson()');
        }

        async DeleteIndividualLesson(id: ObjectId){
            const lesson = await this.individualdbLessons.findOne({_id: id});

            if (lesson){
                const student = await this.ShowOneUser(lesson.idStudent),
                    teacher = await this.ShowOneUser(lesson.idTeacher);

                if (student){
                    if (lesson.type === 'classic'){
                        if (teacher){
                            const set_individual_lessons = teacher.set_individual_lessons?.length ? teacher.set_individual_lessons : false,
                                individual_lessons = student.individual_lessons?.length ? student.individual_lessons : false,
                                string_individual_lessons = set_individual_lessons.map((element: any) => {
                                    return element.toString();
                                }),
                                string_individual_lessons_student = individual_lessons.map((element: any) => {
                                    return element.toString();
                                }),
                                indexElementTeacher = string_individual_lessons?.indexOf(lesson._id.toString()),
                                indexElementStudent = string_individual_lessons_student?.indexOf(lesson._id.toString());
    
                            if (indexElementTeacher !== -1) set_individual_lessons.splice(indexElementTeacher, 1);
                            if (indexElementStudent !== -1) individual_lessons.splice(indexElementStudent, 1);
                            await this.botdbUsers.updateOne({id: teacher.id}, {$set: {set_individual_lessons: set_individual_lessons}});
                            await this.botdbUsers.updateOne({id: student.id}, {$set: {individual_lessons: individual_lessons}});
                        }
                        else throw new Error('\n\Teacher not found DeleteIndividualLesson()');
                        await this.botdbUsers.updateOne({id: student.id}, {$set: {individual_count: parseInt(student.individual_count + lesson.duration)}});
                    }
                    else{
                        if (teacher){
                            const trial_students = teacher.trial_students?.length ? teacher.trial_students : false;

                            if (trial_students && trial_students.includes(lesson.idStudent) && student){
                                await this.botdbUsers.updateOne({_id: teacher._id}, {$set: {trial_students: trial_students.filter((id: any) => id !== lesson.idStudent)}});
                                await this.botdbUsers.updateOne({_id: student._id}, {$set: {trial: true}});
                            }
                        }
                    }
                    await this.individualdbLessons.deleteOne({_id: id});
                }
                else throw new Error('\n\nUser not found DeleteIndividualLesson()');
            }
            else throw new Error('\n\nLesson not found in DeleteIndividualLesson()');
        }

        async CreateTrialLesson(idStudent: number, idTeacher: number, date: string, time: string, zoom_link: string){
            const student = await this.ShowOneUser(idStudent),
                teacher = await this.ShowOneUser(idTeacher);

            if (student && teacher){
                const teachersStudents = teacher?.trial_students ?? false;
                let teacherHaveThisStudent = false;
                if (teachersStudents.length){
                    for (let i = 0; i < teachersStudents.length; i++){
                        if (teachersStudents[i] === student.id){
                            teacherHaveThisStudent = true;
                            break;
                        }
                    }
                    if (teacherHaveThisStudent){
                        if (new Date(`${date}T${time}`)){
                            const lesson = await this.individualdbLessons.insertOne({
                                idStudent: idStudent,
                                idTeacher: idTeacher,
                                type: "trial",
                                zoom_link: zoom_link,
                                date: date,
                                time: time,
                            });

                            await this.botdbUsers.updateOne({id: idStudent}, {$set: {trial: lesson.insertedId}});
                        }
                        else throw new Error(`\n\nDate is uncorrect. ${date} and ${time}.\n\nIn system view is ${new Date(`${date}T${time}`)}`);
                    }
                    else throw new Error(`\n\nTeacher haven't student ${student.name}`);
                }
                else throw new Error(`\n\nTeacher haven't any student`);
            }
            else throw new Error('\n\nError: can`t find student or teacher in CreateNewIndividualLesson function');
        }

        async GetSpecificIndividualLessons(lessons: ObjectId[]){
            let object = []

            for (let i = 0; i < lessons.length; i++){
                object.push(await this.individualdbLessons.findOne({_id: lessons[i]}));
            }

            return object;
        }

        async GetMessageIDsLiveSupport(oid: ObjectId){
            const object = await this.liveSupport.findOne({ _id: oid });
      
            return [ object!.messageIDs, object!.chatIDs];
        }

        async CreateNewLiveSupport(){
            return await this.liveSupport.insertOne({messageIDs: []});
        }

        async AddMessageIDsLiveSupport(oid: ObjectId, messageIDs: number[], chatIDs: number[]){
            await this.liveSupport.updateOne({_id: oid}, {$set: {messageIDs: messageIDs, chatIDs: chatIDs}})
        }

        async ChangeAvaibiltyForOperator(operatorID: number, available: boolean){
            const operator = await this.ShowOneUser(operatorID);
            if (operator && operator.system_role === 'worker'){
              await this.botdbUsers.updateOne({id: operatorID}, {$set : {available: available ? "available" : "busy" }});
            }
            else return false;
        }

        async GetServiceCareObject(idCare: ObjectId){
            return await this.liveSupport.findOne({_id: idCare});
        }

        async WriteAdditionalQuestionToServiceCare(idCare: ObjectId, question?: string, questionType?: string, questionFiles?: string){
            const serviceCare = await this.liveSupport.findOne({_id: idCare});

            if (serviceCare){
                const questions = serviceCare.question,
                    questionsType = serviceCare.questionsType,
                    questionsFiles = serviceCare.questionsFiles;

                if (question){
                    if (questions?.length){
                        await this.liveSupport.updateOne({_id: idCare}, {$push: {question: question}});        
                    }
                    else await this.liveSupport.updateOne({_id: idCare}, {$set: {question: [ question ]}});
                }
                else if (questionType && questionFiles){
                    if (questionsType?.length && questionsFiles?.length){
                        await this.liveSupport.updateOne({_id: idCare}, {$push: {questionsType: questionType, questionsFiles: questionFiles}});
                    }
                    else await this.liveSupport.updateOne({_id: idCare}, {$set: {questionsType: [ questionType ], questionsFiles: [ questionFiles ]}});
                }
            }
            else throw new Error('ServiceCare not Found. In function WriteAdditionalQuestionToServiceCare()');
        }

        async DeleteServiceCare(idCare: ObjectId){
            await this.liveSupport.deleteOne({_id: idCare});
        }

        async GetUserTrialLessons(idUser: number){
            const allLessons = await this.individualdbLessons.find({}).toArray();
            let returnableObject = [];

            for (let i = 0; i < allLessons.length; i++){
                if (allLessons[i].type === 'trial' && (allLessons[i].idStudent === idUser || allLessons[i].idTeacher === idUser)){
                    returnableObject.push(allLessons[i])
                }
            }

            return returnableObject;
        }

        private Under40Minutes(date: Date){
            if (date.getTime() - new Date().getTime() <= 40 * 60 * 1000) {
                return true;
            }
            else return false;
        }

        private TimeLeft(date: Date){
            return Math.floor((date.getTime() - new Date().getTime()) / 60000);
        }

        async NotificateUserAboutLesson(ctx: Telegram){
            const lessons = await this.individualdbLessons.find({}).toArray();

            if (lessons.length){
                console.log('Have Lessons ' + lessons.length);
                for (let i = 0; i < lessons.length; i++){
                    const lessonDate = new Date(`${lessons[i].date.replace(/\./g, '-')}T${lessons[i].time}`);
                    if (this.Under40Minutes(lessonDate)){
                        const sentNotificationAboutLessons = await this.sentIndividualNotifications.find({}).toArray();
                        if (sentNotificationAboutLessons?.length){
                            if (!sentNotificationAboutLessons.map(item => item.id.toString()).includes(lessons[i]._id.toString())){
                                ctx.sendMessage(lessons[i].idStudent, script.notification.forStudent.lessonComingNotification(
                                    'student',
                                    lessons[i].type,
                                    this.TimeLeft(lessonDate),
                                    UniversalSingleDataProcess(lessonDate, 'day_of_week'),
                                    UniversalSingleDataProcess(lessonDate, 'day'),
                                    UniversalSingleDataProcess(lessonDate, 'month'),
                                    lessons[i].time,
                                    (await this.ShowOneUser(lessons[i].idTeacher))?.name ?? "сталась помилка",
                                    (await this.ShowOneUser(lessons[i].idStudent))?.individual_count ?? 0,
                                    lessons[i].zoom_link ?? '...'
                                ), {parse_mode: "HTML"});
                                ctx.sendMessage(lessons[i].idTeacher, script.notification.forStudent.lessonComingNotification(
                                    'teacher',
                                    lessons[i].type,
                                    this.TimeLeft(lessonDate),
                                    UniversalSingleDataProcess(lessonDate, 'day_of_week'),
                                    UniversalSingleDataProcess(lessonDate, 'day'),
                                    UniversalSingleDataProcess(lessonDate, 'month'),
                                    lessons[i].time,
                                    (await this.ShowOneUser(lessons[i].idStudent))?.name ?? "сталась помилка",
                                    (await this.ShowOneUser(lessons[i].idStudent))?.individual_count ?? 0,
                                    lessons[i].zoom_link ?? '...'
                                ), {parse_mode: "HTML"});
                                console.log(`\nNotification Sent. Lesson start in ${formatDateWithTime(lessonDate)}`);
                                await this.sentIndividualNotifications.insertOne({id: lessons[i]._id});
                            }
                            else console.log('This lesson already notificated ' + formatDateWithTime(lessonDate));
                        }
                        else{
                            ctx.sendMessage(lessons[i].idStudent, script.notification.forStudent.lessonComingNotification(
                                'student',
                                lessons[i].type,
                                this.TimeLeft(lessonDate),
                                UniversalSingleDataProcess(lessonDate, 'day_of_week'),
                                UniversalSingleDataProcess(lessonDate, 'day'),
                                UniversalSingleDataProcess(lessonDate, 'month'),
                                lessons[i].time,
                                (await this.ShowOneUser(lessons[i].idTeacher))?.name ?? "сталась помилка",
                                (await this.ShowOneUser(lessons[i].idStudent))?.individual_count ?? 0,
                                lessons[i].zoom_link ?? '...'
                            ), {parse_mode: "HTML"});
                            ctx.sendMessage(lessons[i].idTeacher, script.notification.forStudent.lessonComingNotification(
                                'teacher',
                                lessons[i].type,
                                this.TimeLeft(lessonDate),
                                UniversalSingleDataProcess(lessonDate, 'day_of_week'),
                                UniversalSingleDataProcess(lessonDate, 'day'),
                                UniversalSingleDataProcess(lessonDate, 'month'),
                                lessons[i].time,
                                (await this.ShowOneUser(lessons[i].idStudent))?.name ?? "сталась помилка",
                                (await this.ShowOneUser(lessons[i].idStudent))?.individual_count ?? 0,
                                lessons[i].zoom_link ?? '...'
                            ), {parse_mode: "HTML"});
                            console.log(`\nNotification Sent. Lesson start in ${formatDateWithTime(lessonDate)}`);
                            await this.sentIndividualNotifications.insertOne({id: lessons[i]._id});
                        }
                    }
                }
            }
            else console.log('No lesson to notificate');
        }

        async DeleteTeNoticationEntryData(){
            const sentNotificationAboutLessons = await this.sentIndividualNotifications.find({}).toArray();

            if (sentNotificationAboutLessons && sentNotificationAboutLessons.length){
                for (let i = 0; i < sentNotificationAboutLessons.length; i++){
                   let lesson = await this.individualdbLessons.findOne({_id: sentNotificationAboutLessons[i].id});

                   if (!lesson){
                    lesson = await this.clubdbLessons.findOne({_id: sentNotificationAboutLessons[i].id});
                    
                    if (!lesson){
                        await this.sentIndividualNotifications.deleteOne({_id: sentNotificationAboutLessons[i]._id});
                    }
                    else{
                        if (this.TimeLeft(new Date(`${lesson!.date.replace(/\./g, '-')}T${lesson!.time}`)) < 0){
                            await this.sentIndividualNotifications.deleteOne({_id: sentNotificationAboutLessons[i]._id});
                        }
                    }
                   }
                   else{
                       if (this.TimeLeft(new Date(`${lesson!.date.replace(/\./g, '-')}T${lesson!.time}`)) < 0){
                        await this.sentIndividualNotifications.deleteOne({_id: sentNotificationAboutLessons[i]._id});
                       }
                   }
                }
            }
        }

        async NotificateUserAboutClubLesson(ctx: Telegram){
            const lessons = await this.ShowAll(),
                users = await this.ShowAllUsers();

            for (let i = 0; i < lessons.length; i++){
                let userHaved : string = '\n\n<b>👉Зареєстровані користувачі</b>\n';
                const lessonDate = new Date(`${lessons[i].date.replace(/\./g, '-')}T${lessons[i].time}`);
                if (this.Under40Minutes(lessonDate)){
                    const sentNotificationAboutLessons = await this.sentIndividualNotifications.find({}).toArray();
                    if (sentNotificationAboutLessons?.length){
                        if (!sentNotificationAboutLessons.map(item => item.id.toString()).includes(lessons[i]._id.toString())){
                            for (let k = 0; k < users.length; k++){
                                if (await this.HasThisClubUser(users[k].id, lessons[i]._id)){
                                    userHaved += `- ${users[k].name} (@${users[k].username})\n📲${users[k].number}\n\n`;
                                    ctx.sendDocument(users[k].id, lessons[i].documentation,
                                        { 
                                            caption: script.notification.forStudent.lessonComingClubNotification(
                                                this.TimeLeft(lessonDate),
                                                UniversalSingleDataProcess(lessonDate, 'day_of_week'),
                                                UniversalSingleDataProcess(lessonDate, 'day'),
                                                UniversalSingleDataProcess(lessonDate, 'month'),
                                                lessons[i].time,
                                                lessons[i].teacher,
                                                lessons[i].title,
                                                lessons[i].link
                                            ), parse_mode: "HTML"
                                        }
                                    );
                                    console.log(`\nNotification Club Lesson Sent to Student. Lesson start in ${formatDateWithTime(lessonDate)}`)
                                }
                            }

                            if (userHaved === '\n\n<b>👉Зареєстровані користувачі</b>\n'){
                                userHaved = '';
                            }

                            ctx.sendDocument(lessons[i].teacher_id, lessons[i].documentation, 
                                {
                                    caption: script.notification.forTeachers.lessonComingClubNotification(
                                        this.TimeLeft(lessonDate),
                                        UniversalSingleDataProcess(lessonDate, 'day_of_week'),
                                        UniversalSingleDataProcess(lessonDate, 'day'),
                                        UniversalSingleDataProcess(lessonDate, 'month'),
                                        lessons[i].time,
                                        lessons[i].title,
                                        lessons[i].link,
                                        userHaved,
                                        lessons[i].count
                                    ), parse_mode: "HTML"
                                }
                            );
                            
                            console.log(`Notification Club Lesson Sent to Teacher. Lesson start in ${formatDateWithTime(lessonDate)}`);
                            await this.sentIndividualNotifications.insertOne({id: lessons[i]._id});
                        }
                    }
                    else{
                        for (let k = 0; k < users.length; k++){
                            if (await this.HasThisClubUser(users[k].id, lessons[i]._id)){
                                userHaved += `- ${users[k].name} (@${users[k].username})\n📲${users[k].number}\n\n`;
                                ctx.sendDocument(users[k].id, lessons[i].documentation,
                                    { 
                                        caption: script.notification.forStudent.lessonComingClubNotification(
                                            this.TimeLeft(lessonDate),
                                            UniversalSingleDataProcess(lessonDate, 'day_of_week'),
                                            UniversalSingleDataProcess(lessonDate, 'day'),
                                            UniversalSingleDataProcess(lessonDate, 'month'),
                                            lessons[i].time,
                                            lessons[i].teacher,
                                            lessons[i].title,
                                            lessons[i].link
                                        ), parse_mode: "HTML"
                                    }
                                );
                                console.log(`Notification Club Lesson Sent to Student. Lesson start in ${formatDateWithTime(lessonDate)}`)
                            }
                        }

                        if (userHaved === '\n\n<b>👉Зареєстровані користувачі</b>\n'){
                            userHaved = '';
                        }

                        ctx.sendDocument(lessons[i].teacher_id, lessons[i].documentation, 
                            {
                                caption: script.notification.forTeachers.lessonComingClubNotification(
                                    this.TimeLeft(lessonDate),
                                    UniversalSingleDataProcess(lessonDate, 'day_of_week'),
                                    UniversalSingleDataProcess(lessonDate, 'day'),
                                    UniversalSingleDataProcess(lessonDate, 'month'),
                                    lessons[i].time,
                                    lessons[i].title,
                                    lessons[i].link,
                                    userHaved,
                                    lessons[i].count
                                ), parse_mode: "HTML"
                            }
                        );
                        
                        console.log(`\nNotification Club Lesson Sent to Teacher. Lesson start in ${formatDateWithTime(lessonDate)}`);
                        await this.sentIndividualNotifications.insertOne({id: lessons[i]._id});
                    }
                }
            }
        }
    }

    const dbProcess : DBProcess = new DBProcess();

    return dbProcess;
}