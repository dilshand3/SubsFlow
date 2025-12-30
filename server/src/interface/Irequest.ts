export interface IadminAuth {
    name : string;
    password : string;
}

export interface IuserRegiser {
    name : string;
    email : string;
    password : string;
}

export interface IuserLogin {
    email : string;
    password: string
}

export interface IcreatePlan {
    name : string;
    description : string;
    price : number;
    duration : string;
    total_capacity : number;
}