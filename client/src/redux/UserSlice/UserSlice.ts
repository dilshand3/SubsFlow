import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

interface IAuthResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        name: string;
        email: string;
    };
}

export const AuthReduxSlice = createApi({
    reducerPath: 'AuthReduxSlice',
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NEXT_PUBLIC_SERVER_API,
        credentials : 'include'
    }),
    endpoints: (builder) => ({
        loginUser: builder.mutation<IAuthResponse, any>({
            query: (credentials) => ({
                url: '/user/loginUser',
                method: 'POST',
                body: credentials,
            }),
        }),
        registerUser: builder.mutation<IAuthResponse, any>({
            query: (userData) => ({
                url: '/user/registerUser',
                method: 'POST',
                body: userData,
            }),
        }),
        getCurrentUser: builder.query<IAuthResponse, void>({
            query: () => "/user/getCurrentUser",
        }),
        logoutUser: builder.query<IAuthResponse, void>({
            query: () => "/user/logoutUser",
        }),
    }),
});

export const { useLoginUserMutation, useRegisterUserMutation, useGetCurrentUserQuery, useLazyLogoutUserQuery } = AuthReduxSlice;