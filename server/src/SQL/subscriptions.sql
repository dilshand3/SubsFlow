CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    start_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMPTZ NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_dates CHECK (end_date > start_date),

    CONSTRAINT fk_customer 
        FOREIGN KEY(customer_id) 
        REFERENCES customers(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_plan 
        FOREIGN KEY(plan_id) 
        REFERENCES plans(id) 
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX unique_active_subscription 
ON subscriptions (customer_id, plan_id) 
WHERE status = 'active';