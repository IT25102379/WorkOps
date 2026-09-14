USE workops_db;
GO

IF OBJECT_ID('dbo.contact_messages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.contact_messages (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        full_name NVARCHAR(150) NOT NULL,
        email NVARCHAR(150) NOT NULL,
        subject NVARCHAR(100) NULL,
        message NVARCHAR(MAX) NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'NEW'
            CONSTRAINT chk_contact_messages_status CHECK (status IN ('NEW', 'READ', 'RESOLVED')),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX idx_contact_messages_status ON dbo.contact_messages (status);
    CREATE INDEX idx_contact_messages_created_at ON dbo.contact_messages (created_at);
END;
GO

SELECT TOP 50 *
FROM dbo.contact_messages
ORDER BY created_at DESC;
GO
