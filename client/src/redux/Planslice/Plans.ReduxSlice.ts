import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

interface IPlan {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
    subscriptions_left: number;
    total_capacity: number;
}

interface IplanSuccess {
    success: boolean;
    message: string;
    data?: IPlan[];
}

export const PlansReduxSlice = createApi({
    reducerPath: 'PlansReduxSlice',
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NEXT_PUBLIC_SERVER_API,
        credentials: "include"
    }),
    tagTypes: ["Plans"],
    endpoints: (builder) => ({
        getAllActivePlans: builder.query<IplanSuccess, void>({
            query: () => "/plan/getAllActivePlan",
            providesTags: ["Plans"],
        }),
    })
})

export const { useGetAllActivePlansQuery } = PlansReduxSlice;