# Supabase Auth Checklist (EcoClear)

1. Open Supabase dashboard -> Authentication -> Providers.
2. Enable `Email` provider.
3. For hackathon flow, disable email confirmation (if you want instant login after signup).
4. Authentication -> URL Configuration:
   - Site URL: `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173/**`
5. Open SQL Editor and run [`auth_setup.sql`](./auth_setup.sql).
6. Create test users from Authentication -> Users.
7. Update roles in `public.profiles`:

```sql
update public.profiles set role = 'admin' where email = 'ram@example.com';
update public.profiles set role = 'scrutiny_team' where email = 'rahul@example.com';
update public.profiles set role = 'mom_team' where email = 'priya@example.com';
```
