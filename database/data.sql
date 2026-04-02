-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: tenantsync
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `ai_logs`
--

LOCK TABLES `ai_logs` WRITE;
/*!40000 ALTER TABLE `ai_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `announcements`
--

LOCK TABLES `announcements` WRITE;
/*!40000 ALTER TABLE `announcements` DISABLE KEYS */;
/*!40000 ALTER TABLE `announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `apartments`
--

LOCK TABLES `apartments` WRITE;
/*!40000 ALTER TABLE `apartments` DISABLE KEYS */;
/*!40000 ALTER TABLE `apartments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `complaints`
--

LOCK TABLES `complaints` WRITE;
/*!40000 ALTER TABLE `complaints` DISABLE KEYS */;
/*!40000 ALTER TABLE `complaints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2019_12_14_000001_create_personal_access_tokens_table',1),(2,'2026_03_05_161111_create_users_table',1),(3,'2026_03_05_162746_create_apartments_table',1),(4,'2026_03_05_162921_create_units_table',1),(5,'2026_03_05_162928_create_tenants_table',1),(6,'2026_03_05_162936_create_rent_payments_table',1),(7,'2026_03_05_162944_create_complaints_table',1),(8,'2026_03_05_162952_create_announcements_table',1),(9,'2026_03_05_163406_create_ai_logs_table',1);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `rent_payments`
--

LOCK TABLES `rent_payments` WRITE;
/*!40000 ALTER TABLE `rent_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `rent_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `units`
--

LOCK TABLES `units` WRITE;
/*!40000 ALTER TABLE `units` DISABLE KEYS */;
/*!40000 ALTER TABLE `units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Owner Admin','admin@tenantsync.com',NULL,'$2y$10$ZQHhkzbV8mp1n1uFZQgm6Og1V/14YEWE7thHIMjSgE3redUXyEavW','admin','active','2026-03-07 10:47:11','2026-03-07 10:47:11'),(2,'koli123','koli123@gmail.com','2026-03-03','$2y$10$bbt0V5iZq32nXlDaZ/f.5.Cj9mLU99rW51t5lJeeBsIYDuJzqcEfy','tenant','active','2026-03-07 19:00:28','2026-03-07 19:00:28'),(3,'Test Manager','manager@test.com','1995-01-01','$2y$10$ZL/niADyDBilJpJiXD8CheMHRAKjIvuFdtgvXnuoX3f6tnRS.81Vm','manager','active','2026-03-07 19:08:34','2026-03-07 19:08:34'),(4,'Admin Test','admin@test.com',NULL,'$2y$10$dz5WRFZv.fSbfri8MWI5oey8OArKTfG0BOaup01O8nvgBNrMbRqLy','admin','active','2026-03-07 20:03:01','2026-03-07 20:03:01'),(5,'lubna123','lubna123@gmail.com','2026-02-11','$2y$10$up.H9BzPDoXjn2e7ouP/5e5.mUlgfw7jygjgIQUDqkE9.phBVdizK','tenant','active','2026-03-07 20:54:07','2026-03-07 20:54:07');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-02 16:05:26
