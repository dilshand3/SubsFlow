'use client'
import React, { useState } from 'react'
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import {
    useGetAuditLogsHistoryQuery,
    useAdminConfirmFailedSubscriptionMutation
} from '@/redux/AdminSlice/AdminSlice';

const Audit_logs = () => {
    const { isAdminAuthenticated } = useSelector((state: RootState) => state.global);
    const shouldFetch = isAdminAuthenticated;

    const [searchTerm, setSearchTerm] = useState('');
    const [userIdFilter, setUserIdFilter] = useState('');

    const { data: logsData, isLoading: logsLoading } = useGetAuditLogsHistoryQuery(
        userIdFilter ? { userId: userIdFilter } : undefined, 
        { skip: !shouldFetch }
    );

    const [confirmSubscription, { isLoading: isConfirming }] = useAdminConfirmFailedSubscriptionMutation();

    const handleConfirmLog = async (logId: string) => {
        if (confirm("Force confirm this failed subscription?")) {
            try {
                const res = await confirmSubscription({ logId }).unwrap();
                alert(res.message);
            } catch (error: any) { 
                alert(error?.data?.message || "Action failed"); 
            }
        }
    };

    const formatDate = (date: string) => new Date(date).toLocaleString('en-IN');

    const filteredLogs = logsData?.data?.filter((log: any) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            log.customer_name?.toLowerCase().includes(term) ||
            log.customer_email?.toLowerCase().includes(term) ||
            log.description?.toLowerCase().includes(term) ||
            log.event_type?.toLowerCase().includes(term)
        );
    });

    return (
        <>
            <div className="logs-header-row">
                <h2 className="section-heading" style={{ margin: 0 }}>Audit Logs</h2>

                <div className="search-container">
                    <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#888">
                        <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by Name, Email or Event..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>
            <div className="logs-container">
                <div className="table-wrapper">
                    <table className="logs-table">
                        <thead>
                            <tr><th>Event</th><th>Description</th><th>Customer</th><th>Plan</th><th>Time</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            {logsLoading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center' }}>Loading logs...</td></tr>
                            ) : filteredLogs?.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No matching logs found.</td></tr>
                            ) : (
                                filteredLogs?.map((log: any) => (
                                    <tr key={log.id}>
                                        <td><span className={`badge ${log.event_type.toLowerCase()}`}>{log.event_type}</span></td>
                                        <td>{log.description}</td>
                                        <td>{log.customer_name}<br /><small>{log.customer_email}</small></td>
                                        <td>{log.plan_name}</td>
                                        <td>{formatDate(log.created_at)}</td>
                                        <td>
                                            {log.event_type === 'PURCHASE_FAILED' ? (
                                                <button onClick={() => handleConfirmLog(log.id)} className="btn-confirm" disabled={isConfirming} title='.'>
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFA915">
                                                        <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
                                                    </svg>
                                                </button>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
}

export default Audit_logs;