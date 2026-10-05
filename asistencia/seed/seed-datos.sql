-- Demo data: 18 employees and their attendance for the last six weeks.
--
-- Safe to run more than once:
--   * users are inserted with INSERT IGNORE (login and cedula are UNIQUE), so
--     existing users -- including any with the same login/cedula -- are kept;
--   * attendance is regenerated only for the cedulas listed here.
-- Real users and their attendance are never modified.
--
-- Every demo user logs in with password 123456.
-- Times are deterministic (CRC32 of cedula + day), so each run produces the
-- same schedule relative to the current date. Requires MariaDB (seq_* tables).

SET NAMES utf8mb4;

CREATE TEMPORARY TABLE seed_usuarios (
  nombre         VARCHAR(45) NOT NULL,
  apellidos      VARCHAR(45) NOT NULL,
  login          VARCHAR(45) NOT NULL,
  codigo_persona VARCHAR(20) NOT NULL,
  departamento   VARCHAR(45) NOT NULL
);

INSERT INTO seed_usuarios (nombre, apellidos, login, codigo_persona, departamento) VALUES
  ('María Fernanda',  'Rodríguez Peña',    'mrodriguez', '18234567', 'Gerencia'),
  ('José Gregorio',   'Hernández Briceño', 'jhernandez', '15876321', 'Gerencia'),
  ('Ana Karina',      'Pérez Valera',      'aperez',     '20456789', 'Administrativo'),
  ('Luis Alberto',    'González Matheus',  'lgonzalez',  '17345678', 'Administrativo'),
  ('Carmen Elena',    'Torres Araujo',     'ctorres',    '21987654', 'Administrativo'),
  ('Carlos Eduardo',  'Ramírez Quintero',  'cramirez',   '16543210', 'Docente'),
  ('Yusmary',         'Díaz Montilla',     'ydiaz',      '19654321', 'Docente'),
  ('Pedro Antonio',   'Mendoza Barrios',   'pmendoza',   '14321987', 'Docente'),
  ('Rosa Virginia',   'Castillo Linares',  'rcastillo',  '22345098', 'Docente'),
  ('Jesús Manuel',    'Uzcátegui Rivas',   'juzcategui', '23456109', 'Docente'),
  ('Daniela Alejandra','Salas Viloria',    'dsalas',     '25678901', 'Docente'),
  ('Ramón Antonio',   'Paredes Durán',     'rparedes',   '13987456', 'Obrero'),
  ('Wilmer José',     'Briceño Godoy',     'wbriceno',   '18765012', 'Obrero'),
  ('Gladys Josefina', 'Araujo Terán',      'garaujo',    '12654789', 'Cocinera'),
  ('Yelitza',         'Moreno Bastidas',   'ymoreno',    '16098765', 'Cocinera'),
  ('Franklin',        'Villegas Rojas',    'fvillegas',  '17890123', 'Vigilante'),
  ('Nelson Enrique',  'Abreu Carrillo',    'nabreu',     '15234890', 'Vigilante'),
  ('Lisbeth Carolina','Quintero Azuaje',   'lquintero',  '24567012', 'Administrativo');

INSERT IGNORE INTO usuarios
  (nombre, apellidos, login, iddepartamento, idtipousuario, email, password,
   imagen, estado, fechacreado, usuariocreado, codigo_persona, idmensaje, iteracion)
SELECT s.nombre, s.apellidos, s.login, d.iddepartamento, t.idtipousuario, '',
       SHA2('123456', 256), '', 1, NOW() - INTERVAL 60 DAY, s.nombre,
       s.codigo_persona, 0, 0
FROM seed_usuarios s
JOIN departamento d ON d.nombre = s.departamento
JOIN tipousuario t ON t.nombre = 'Empleado';

-- Only the demo cedulas that now belong to a user get attendance.
CREATE TEMPORARY TABLE seed_cedulas AS
SELECT s.codigo_persona
FROM seed_usuarios s
JOIN usuarios u ON u.codigo_persona = s.codigo_persona;

DELETE a FROM asistencia a
JOIN seed_cedulas c ON c.codigo_persona = a.codigo_persona;

-- Weekdays of the last six weeks. Per person and day: about 7% absences,
-- arrival between 06:50 and 07:45, departure between 12:30 and 14:00.
CREATE TEMPORARY TABLE seed_jornadas AS
SELECT c.codigo_persona,
       CURDATE() - INTERVAL s.seq DAY AS dia,
       TIMESTAMP(CURDATE() - INTERVAL s.seq DAY,
                 SEC_TO_TIME(6*3600 + 50*60
                   + CRC32(CONCAT(c.codigo_persona, s.seq, 'e')) % 3300)) AS entrada,
       TIMESTAMP(CURDATE() - INTERVAL s.seq DAY,
                 SEC_TO_TIME(12*3600 + 30*60
                   + CRC32(CONCAT(c.codigo_persona, s.seq, 's')) % 5400)) AS salida
FROM seed_cedulas c
CROSS JOIN seq_0_to_41 s
WHERE DAYOFWEEK(CURDATE() - INTERVAL s.seq DAY) BETWEEN 2 AND 6
  AND CRC32(CONCAT(c.codigo_persona, s.seq, 'a')) % 100 >= 7;

-- The kiosk alternates Entrada/Salida by counting a person's rows, so every
-- finished day is a pair. Today only has the arrivals that already happened,
-- leaving the next kiosk mark as that person's Salida.
INSERT INTO asistencia (codigo_persona, fecha_hora, tipo, fecha)
SELECT codigo_persona, ts, tipo, dia
FROM (
  SELECT codigo_persona, entrada AS ts, 'Entrada' AS tipo, dia
  FROM seed_jornadas
  WHERE entrada <= NOW()
  UNION ALL
  SELECT codigo_persona, salida, 'Salida', dia
  FROM seed_jornadas
  WHERE dia < CURDATE()
) j
ORDER BY ts;

SELECT
  (SELECT COUNT(*) FROM seed_cedulas) AS usuarios_demo,
  (SELECT COUNT(*) FROM asistencia a JOIN seed_cedulas c
     ON c.codigo_persona = a.codigo_persona) AS asistencias_demo;
