import { MongoClient, ObjectId } from "mongodb";

export default async function dbProcess(botdb: MongoClient){
    class DBProcess {
        private clubdbLessons = botdb.db('dehtoBDB').collection('clubLessons');
        private botdbUsers = botdb.db('dehtoBDB').collection('dataUsers');
        private deTaskDB = botdb.db('dehtoBDB').collection('deTask');

        async ShowAll() {
            return await this.clubdbLessons.find({}).toArray();
        }

        async AddData(data: {title: string, teacher: string, date: string, time: string, count: number, link: string}) {
            return await this.clubdbLessons.insertOne(data);
        }

        async DeleteData(id: ObjectId) {
            await this.clubdbLessons.deleteOne({ _id: new ObjectId(id) });
        }

        async ChangeKeyData(id: Object, key: string, value: string | number){
            const updateObject = { $set: {} } as { $set: { [key: string]: string | number } };
            updateObject.$set[key] = value;

            await this.clubdbLessons.updateOne(id, updateObject);
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
            await this.botdbUsers.deleteOne({ id: id });
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
        
                dayOfWeek = daysOfWeek[date.getUTCDay()],
                month = months[date.getUTCMonth()],
                day = date.getUTCDate();
        
            return `${day} ${month} (${dayOfWeek})`;
        }
        
        async DeleteExpiredClubs() {
            const clubs = await this.ShowAll(),
                users = await this.ShowAllUsers();

            for(let i = 0; i < clubs.length; i++){
                if (this.isTimeExpired(new Date(`${clubs[i].date}T${clubs[i].time}`))){
                    console.log('\nFounded Expired Club And Deleted\n')
                    this.DeleteData(clubs[i]._id);
                    for (let j = 0; j < users.length; j++){
                        this.DeleteClubFromUser(users[j].id, clubs[i]._id);
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
                tasksIDsForTeacher: ObjectId[],
                system_message = '';
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
                tasksIDsForStudent = document.insertedId;
                system_message = 'student_task_rewrited';
            }
            else{
                tasksIDsForStudent = document.insertedId;
                system_message = 'student_task_writed';
            }

            if (teacher && teacher.set_detasks){
                tasksIDsForTeacher = teacher.set_detasks;
                tasksIDsForTeacher.push(document.insertedId);
            }
            else tasksIDsForTeacher = [ document.insertedId ];

            await this.botdbUsers.updateOne({id: idStudent}, {$set : {detask: tasksIDsForStudent}})
            await this.botdbUsers.updateOne({id: idTeacher}, {$set : {set_detasks: tasksIDsForTeacher}})
            return system_message;
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
                                newTeacherStudents = newTeacher.registered_students,
                                indexInMassiveOld = oldTeacherStudents.indexOf(user.name),
                                indexInMassiveNew = newTeacherStudents.indexOf(user.name);

                            if (indexInMassiveOld !== -1){
                                oldTeacherStudents.splice(indexInMassiveOld, 1);

                                const updateObjectTeacher = {$set : {
                                    registered_students: oldTeacherStudents
                                }}

                                await this.botdbUsers.updateOne({_id: usersTeacher._id}, updateObjectTeacher);
                            }
                            else throw new Error('\n\nUser not found in old Teacher');

                            if (indexInMassiveNew === -1){
                                newTeacherStudents.push(user!.name);

                                const updateObjectTeacher = {$set : {
                                    registered_students: newTeacherStudents
                                }}

                                await this.botdbUsers.updateOne({_id: newTeacher._id}, updateObjectTeacher);
                                await this.botdbUsers.updateOne({_id: user._id}, {$set: {teacher: newTeacher.id}})
                            }
                            else throw new Error('\n\nNew Teacher already have this student');
                        }
                        else{
                            const newTeacher = await this.ShowOneUser(await this.GetUserIDByName(value.toString())),
                                newTeacherStudents = newTeacher!.registered_students,
                                indexInMassiveNew = newTeacherStudents.indexOf(user.name);

                            if (indexInMassiveNew === -1 && newTeacher){
                                let ifEmpty = [];
                                newTeacherStudents ? newTeacherStudents.push(user!.name) : ifEmpty.push(user!.name);

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
                                indexInMassiveOld = currentStudents.indexOf(user.name);

                            if (indexInMassiveOld !== -1){
                                currentStudents.splice(indexInMassiveOld, 1);

                                const updateObjectTeacher = {$set : {
                                    registered_students: currentStudents
                                }}

                                await this.botdbUsers.updateOne({_id: currentTeacher._id}, updateObjectTeacher);
                                await this.botdbUsers.updateOne({_id: user._id}, {$set: {teacher: false, role: 'guest'}})
                            }
                            else throw new Error('\n\nUser not found in Teacher');
                        }
                        break;

                    default:
                        throw new Error('\n\nUncorrect parametr in IndividualChangeUserData()');
                }
            }
            else throw new Error('\n\nUser not found in IndividualChangeUserData()');
        }

        async DeleteTeacherFromPost(idTeacher: number){
            const teacherObject = await dbProcess.ShowOneUser(idTeacher),
                teacherDetasks = teacherObject?.set_detasks;

            if (teacherObject){
                await this.botdbUsers.updateMany({teacher: idTeacher}, {$set: {teacher: false, detask: false}});
                await this.botdbUsers.updateOne({id: teacherObject!.idTeacher}, {$set : {registered_students: [], role: 'guest', set_detasks: []}});
                if (teacherDetasks){
                    for (let i = 0; i < teacherDetasks.length; i++){
                        await this.deTaskDB.deleteOne({_id: teacherDetasks[i]})
                    }
                }
                return true;
            }
            else return false;
        }
    }

    const dbProcess : DBProcess = new DBProcess();

    return dbProcess;
}