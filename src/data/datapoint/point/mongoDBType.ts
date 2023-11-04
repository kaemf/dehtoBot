import { ObjectId } from 'mongodb';

export default interface MongoDBReturnType {
    _id: ObjectId;
    title: string;
    teacher: string;
    date: string;
    time: string;
    count: number;
    link: string;
}