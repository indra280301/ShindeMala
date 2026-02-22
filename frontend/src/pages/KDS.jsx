import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Clock, CheckCircle, ChefHat, AlertOctagon } from 'lucide-react';
import api from '../api/axios';
import { useStore } from '../store/useStore';

const KDS = ({ isBar = false }) => {
    // Ticket structure from backend: { ticket_id, order_id, status, table_number, created_at, items: [ {item_id, name, quantity} ] }
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const refreshTrigger = useStore((state) => state.refreshTrigger);
    const user = useStore((state) => state.user);

    useEffect(() => {
        fetchTickets();
        const interval = setInterval(fetchTickets, 10000);
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    const fetchTickets = async () => {
        try {
            const { data } = await api.get(`/orders/kds?t=${new Date().getTime()}`);
            setTickets(data || []);
        } catch (error) {
            console.error('Error fetching KDS tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = async (result) => {
        if (!result.destination || user?.role === 'waiter') return;

        const sourceCol = result.source.droppableId;
        const destCol = result.destination.droppableId;

        if (sourceCol === destCol) return; // No status change

        // Find the dropped ticket
        const ticketId = result.draggableId;
        const ticket = tickets.find(t => t.ticket_id === ticketId);

        if (!ticket) return;

        // Optimistically update UI
        setTickets(prev => prev.map(t => {
            if (t.ticket_id === ticketId) {
                return { ...t, status: destCol };
            }
            return t;
        }));

        try {
            const itemIds = ticket.items.map(i => i.item_id);
            await api.put(`/orders/${ticket.order_id}/items/status`, {
                item_ids: itemIds,
                new_status: destCol
            });
            fetchTickets();
        } catch (err) {
            console.error('Failed to move ticket', err);
            fetchTickets(); // Revert on failure
        }
    };

    const acknowledgeReadyTicket = async (ticket) => {
        try {
            const itemIds = ticket.items.map(i => i.item_id);
            await api.put(`/orders/${ticket.order_id}/items/status`, {
                item_ids: itemIds,
                new_status: 'served'
            });
            fetchTickets();
        } catch (err) {
            console.error('Failed to acknowledge ticket', err);
        }
    };

    // Derived columns
    const columns = {
        pending: { name: 'Orders Received', items: tickets.filter(t => t.status === 'pending') },
        processing: { name: 'In Progress', items: tickets.filter(t => t.status === 'processing') },
        ready: { name: 'Ready To Serve', items: tickets.filter(t => t.status === 'ready') },
        cancelled: { name: 'Cancelled', items: tickets.filter(t => t.status === 'cancelled') },
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'var(--text-secondary)';
            case 'processing': return 'var(--warning)';
            case 'ready': return 'var(--success)';
            case 'cancelled': return 'var(--danger)';
            default: return 'var(--text-secondary)';
        }
    };

    const getTimeElapsed = (createdAt) => {
        const diff = Math.floor((new Date() - new Date(createdAt)) / 60000);
        return `${diff} min`;
    };

    if (loading && tickets.length === 0) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Ticket Board...</div>;
    }

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div>
                    <h1 style={styles.pageTitle}>Kitchen Visual Ticket Board</h1>
                    <p style={styles.pageSubtitle}>Drag and Drop tickets to update their status.</p>
                </div>
            </header>

            <DragDropContext onDragEnd={handleDragEnd}>
                <div style={styles.board} className="kds-board">
                    {Object.entries(columns).map(([colId, col]) => (
                        <div key={colId} style={styles.columnWrapper} className="kds-column">
                            <div style={{ ...styles.columnHeader, borderBottomColor: getStatusColor(colId) }}>
                                <h3 style={styles.columnTitle}>{col.name}</h3>
                                <span style={styles.countBadge}>{col.items.length}</span>
                            </div>

                            <Droppable droppableId={colId} isDropDisabled={user?.role === 'waiter'}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        style={{
                                            ...styles.columnContent,
                                            backgroundColor: snapshot.isDraggingOver ? 'rgba(255,255,255,0.02)' : 'transparent'
                                        }}
                                    >
                                        {col.items.map((ticket, index) => (
                                            <Draggable
                                                key={ticket.ticket_id}
                                                draggableId={ticket.ticket_id}
                                                index={index}
                                                isDragDisabled={user?.role === 'waiter'}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{
                                                            ...styles.ticketCard,
                                                            borderLeft: `4px solid ${getStatusColor(colId)}`,
                                                            opacity: snapshot.isDragging ? 0.8 : 1,
                                                            transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.02)` : provided.draggableProps.style?.transform,
                                                            ...provided.draggableProps.style
                                                        }}
                                                    >
                                                        <div style={styles.ticketHeader}>
                                                            <span style={styles.orderId}>#{ticket.order_id}</span>
                                                            <span style={styles.tableRef}>{ticket.table_number}</span>
                                                        </div>

                                                        <div style={styles.ticketMeta}>
                                                            <div style={styles.timeTag}>
                                                                <Clock size={12} />
                                                                {getTimeElapsed(ticket.created_at)}
                                                            </div>
                                                            <span style={styles.waiterName}>{ticket.waiter_name}</span>
                                                        </div>

                                                        <div style={{ ...styles.itemList, textDecoration: colId === 'cancelled' ? 'line-through' : 'none', opacity: colId === 'cancelled' ? 0.8 : 1 }}>
                                                            {ticket.items.map((item, idx) => (
                                                                <div key={idx} style={styles.itemRow}>
                                                                    <span style={styles.itemQty}>{item.quantity}x</span>
                                                                    <span style={{ color: colId === 'cancelled' ? 'var(--danger)' : 'inherit' }}>{item.name}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {colId === 'ready' && (user?.role === 'waiter' || user?.role === 'admin') && (
                                                            <button
                                                                onClick={() => acknowledgeReadyTicket(ticket)}
                                                                style={styles.ackBtn}
                                                            >
                                                                <CheckCircle size={14} />
                                                                Acknowledge Delivery
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
};

const styles = {
    container: {
        padding: '24px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
    },
    pageTitle: {
        fontSize: '24px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        margin: '0 0 4px 0'
    },
    pageSubtitle: {
        fontSize: '14px',
        color: 'var(--text-secondary)',
        margin: 0
    },
    board: {
        display: 'flex',
        gap: '20px',
        flex: 1,
        minHeight: 0,
        overflowX: 'auto',
        paddingBottom: '20px'
    },
    columnWrapper: {
        flex: 1,
        minWidth: '280px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    columnHeader: {
        padding: '16px',
        borderBottom: '2px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)'
    },
    columnTitle: {
        margin: 0,
        fontSize: '15px',
        fontWeight: '600',
        color: 'var(--text-primary)'
    },
    countBadge: {
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-secondary)',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
    },
    columnContent: {
        padding: '12px',
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'background-color 0.2s ease'
    },
    ticketCard: {
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    ticketHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--border-color)'
    },
    orderId: {
        fontSize: '13px',
        color: 'var(--text-secondary)',
        fontWeight: '600'
    },
    tableRef: {
        background: 'var(--bg-primary)',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '13px',
        fontWeight: 'bold',
        color: 'var(--gold-accent)'
    },
    ticketMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'var(--text-secondary)'
    },
    timeTag: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    },
    waiterName: {
        fontWeight: '500'
    },
    itemList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginTop: '8px'
    },
    itemRow: {
        display: 'flex',
        gap: '8px',
        fontSize: '14px',
        color: 'var(--text-primary)'
    },
    itemQty: {
        fontWeight: '700',
        color: 'var(--gold-accent)',
        minWidth: '20px'
    },
    ackBtn: {
        marginTop: '12px',
        padding: '10px',
        backgroundColor: 'var(--success)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        width: '100%',
        transition: 'opacity 0.2s',
    }
};

export default KDS;
