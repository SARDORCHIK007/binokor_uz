import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

NS = uuid.UUID("8c8c0c2a-3e1e-4b5a-9c1d-0a0a0a0a0a0a")

DEMO_USERS: tuple[tuple[str, str, str, str], ...] = (
    ("admin", "+998901000001", "Dilshod Rahimov", "admin"),
    ("mentor", "+998901000002", "Akmal Yusupov", "mentor"),
    ("student", "+998901000003", "Aziz Karimov", "student"),
)


def uid(name: str) -> uuid.UUID:
    return uuid.uuid5(NS, f"uychibinokor:{name}")


async def seed_login_users(conn: AsyncConnection) -> None:
    for key, phone, full_name, role in DEMO_USERS:
        user_id = uid(f"user:{key}")
        await conn.execute(
            text(
                """
                INSERT INTO users (id, phone, full_name, locale)
                VALUES (:id, :phone, :full_name, 'uz-Latn')
                ON CONFLICT (phone) DO NOTHING
                """
            ),
            {"id": user_id, "phone": phone, "full_name": full_name},
        )
        await conn.execute(
            text(
                """
                INSERT INTO user_roles (id, user_id, role)
                SELECT :role_id, u.id, CAST(:role AS role_code)
                FROM users u
                WHERE u.phone = :phone
                  AND NOT EXISTS (
                    SELECT 1 FROM user_roles r
                    WHERE r.user_id = u.id AND r.role = CAST(:role AS role_code)
                  )
                """
            ),
            {"role_id": uid(f"role:{key}"), "phone": phone, "role": role},
        )
