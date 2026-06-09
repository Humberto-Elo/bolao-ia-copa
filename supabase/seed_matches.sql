insert into public.matches (home_team, away_team, match_date, status)
values
('Brasil', 'Espanha', '2026-06-11 16:00:00-03', 'scheduled'),
('Argentina', 'França', '2026-06-11 19:00:00-03', 'scheduled'),
('Alemanha', 'Portugal', '2026-06-12 16:00:00-03', 'scheduled'),
('Inglaterra', 'Itália', '2026-06-12 19:00:00-03', 'scheduled'),
('Uruguai', 'Holanda', '2026-06-13 12:00:00-03', 'scheduled'),
('Bélgica', 'Croácia', '2026-06-13 15:00:00-03', 'scheduled')
on conflict do nothing;
