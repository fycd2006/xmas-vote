-- Migration 0002_add_group_and_scores.sql
-- 為菜色新增組別與評審加扣分欄位（準時度、完成度、收拾）

ALTER TABLE dishes ADD COLUMN group_name TEXT NOT NULL DEFAULT '';
ALTER TABLE dishes ADD COLUMN score_punctuality INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dishes ADD COLUMN score_completeness INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dishes ADD COLUMN score_cleanup INTEGER NOT NULL DEFAULT 0;
