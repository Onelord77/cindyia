-- Adiciona flag para forçar troca de senha no primeiro acesso
alter table profiles add column if not exists must_change_password boolean not null default false;
