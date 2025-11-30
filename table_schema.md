| column_name        | data_type                | is_nullable | column_default                  |
| ------------------ | ------------------------ | ----------- | ------------------------------- |
| id                 | uuid                     | NO          | gen_random_uuid()               |
| bike1_name         | character varying        | NO          | null                            |
| bike2_name         | character varying        | NO          | null                            |
| comparison_type    | character varying        | YES         | 'comparison'::character varying |
| current_step       | integer                  | YES         | 1                               |
| completed_steps    | ARRAY                    | YES         | '{}'::integer[]                 |
| scraped_data       | jsonb                    | YES         | '{}'::jsonb                     |
| insights           | jsonb                    | YES         | null                            |
| personas           | jsonb                    | YES         | null                            |
| verdicts           | jsonb                    | YES         | null                            |
| narrative_plan     | jsonb                    | YES         | null                            |
| article_sections   | jsonb                    | YES         | '[]'::jsonb                     |
| article_word_count | integer                  | YES         | 0                               |
| quality_report     | jsonb                    | YES         | null                            |
| quality_checks     | jsonb                    | YES         | '[]'::jsonb                     |
| final_article      | text                     | YES         | ''::text                        |
| status             | character varying        | YES         | 'draft'::character varying      |
| created_at         | timestamp with time zone | YES         | now()                           |
| updated_at         | timestamp with time zone | YES         | now()                           |
| display_name       | character varying        | YES         | null                            |