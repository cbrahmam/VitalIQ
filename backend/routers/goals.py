import sqlite3
from fastapi import APIRouter, Depends, HTTPException

from database import get_db_connection
from models.db_models import insert_goal, get_goals, get_goal_by_id, update_goal, delete_goal
from models.schemas import GoalCreate, GoalUpdate

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.post("")
def create_goal(body: GoalCreate, conn: sqlite3.Connection = Depends(get_db_connection)):
    goal_id = insert_goal(conn, body.model_dump())
    return get_goal_by_id(conn, goal_id)


@router.get("")
def list_goals(status: str | None = None,
               conn: sqlite3.Connection = Depends(get_db_connection)):
    return get_goals(conn, status)


@router.put("/{goal_id}")
def modify_goal(goal_id: str, body: GoalUpdate,
                conn: sqlite3.Connection = Depends(get_db_connection)):
    result = update_goal(conn, goal_id, body.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail="Goal not found")
    return result


@router.delete("/{goal_id}")
def remove_goal(goal_id: str, conn: sqlite3.Connection = Depends(get_db_connection)):
    if not delete_goal(conn, goal_id):
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"ok": True}
