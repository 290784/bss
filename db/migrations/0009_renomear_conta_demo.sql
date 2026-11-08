-- Conta de demonstração (vitrine@beautyos.dev): a dona passa a se chamar Gabriela Olimpio, tratada como "Bibiu".
-- Só mexe nessa conta e só enquanto ela ainda tem os nomes antigos (rodar de novo não muda nada).
update app.users set full_name = 'Gabriela Olimpio', nickname = 'Bibiu'
 where lower(email) = 'vitrine@beautyos.dev' and full_name in ('Bia Monteiro', 'Bibiu');
update app.professionals set display_name = 'Bibiu'
 where display_name = 'Bia Monteiro'
   and organization_id in (select id from app.organizations where is_demo and created_by in (select id from app.users where lower(email) = 'vitrine@beautyos.dev'));
