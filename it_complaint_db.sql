-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: it_complaint_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `complaints`
--

DROP TABLE IF EXISTS `complaints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `complaints` (
  `ticket_id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_code` varchar(20) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category` varchar(50) NOT NULL,
  `department` varchar(150) DEFAULT 'Ministry Office',
  `priority` varchar(20) NOT NULL,
  `description` text NOT NULL,
  `attachment_url` varchar(255) DEFAULT NULL,
  `status` enum('Pending','In_Progress','Resolved') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `assigned_to` varchar(100) DEFAULT 'Unassigned',
  `action_note` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ticket_id`),
  UNIQUE KEY `ticket_code` (`ticket_code`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `complaints_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `complaints`
--

LOCK TABLES `complaints` WRITE;
/*!40000 ALTER TABLE `complaints` DISABLE KEYS */;
INSERT INTO `complaints` VALUES (1,'IT-2026-4586',1,'Hardware','Ministry Office','Low','cddvdsv','http://127.0.0.1:8000/uploads/1788244586_Screenshot 2025-04-09 085004.png','Resolved','2026-09-01 06:36:26','IT Officer - Hardware','','2026-09-01 06:39:45'),(2,'IT-2026-4624',1,'Software','Ministry Office','High','fgrh','http://127.0.0.1:8000/uploads/1788244624_Screenshot 2025-04-09 085137.png','Resolved','2026-09-01 06:37:04','IT Officer - Hardware','','2026-09-01 06:48:21'),(3,'IT-2026-4649',1,'Hardware','Ministry Office','Critical','dd',NULL,'Resolved','2026-09-01 06:37:29','Network Engineer','','2026-09-01 06:48:25'),(4,'IT-2026-4681',1,'Hardware','Ministry Office','Low','fggrgre','http://127.0.0.1:8000/uploads/1788244681_Screenshot 2025-04-09 085137.png','Resolved','2026-09-01 06:38:01','IT Officer - Hardware','','2026-09-01 06:48:26'),(5,'IT-2026-5282',1,'Hardware','Ministry Office','Low','dv',NULL,'Resolved','2026-09-01 06:48:02','Unassigned',NULL,'2026-09-01 06:48:28'),(7,'IT-2026-6695',4,'Hardware','Ministry Office','Critical','jjjj','http://127.0.0.1:8000/uploads/1788326695_Gemini_Generated_Image_mwjqxqmwjqxqmwjq.png','Pending','2026-09-02 05:24:55','Unassigned',NULL,'2026-09-02 05:24:55'),(8,'IT-2026-6707',4,'Hardware','Ministry Office','Low','tjjj',NULL,'Pending','2026-09-02 05:25:07','Unassigned',NULL,'2026-09-02 05:25:07'),(9,'IT-2026-7081',4,'Hardware','Ministry Office','High','ddc',NULL,'Pending','2026-09-02 05:31:21','Unassigned',NULL,'2026-09-02 05:31:21'),(10,'IT-2026-7096',4,'Hardware','Ministry Office','High','dcas',NULL,'Pending','2026-09-02 05:31:36','Unassigned',NULL,'2026-09-02 05:31:36'),(11,'IT-2026-7121',4,'Hardware','Ministry Office','High','dbdfbd',NULL,'Resolved','2026-09-02 05:32:01','Anura Gunawardena (IT Specialist)','','2026-09-02 06:18:17'),(12,'IT-2026-7396',4,'Hardware','Ministry Office','Medium','hdt','http://127.0.0.1:8000/uploads/1788327396_fb 82.MP3','Resolved','2026-09-02 05:36:36','Unassigned','','2026-09-02 06:17:28'),(13,'IT-2026-8174',4,'Hardware','Ministry Office','Medium','csaa',NULL,'Resolved','2026-09-02 05:49:34','Unassigned',NULL,'2026-09-02 05:50:49'),(15,'IT-2026-9236',4,'Network','Ministry Office','High','vvs',NULL,'Resolved','2026-09-02 06:07:16','Unassigned','pkoooooo','2026-09-02 06:19:38'),(17,'IT-2026-2457',1,'Network','Ministry Office','Critical','fwefwf',NULL,'Pending','2026-09-08 07:27:37','Unassigned',NULL,'2026-09-08 07:27:37'),(18,'IT-2026-2545',1,'Network','Ministry Office','Medium','llgulllllll,',NULL,'In_Progress','2026-09-08 07:29:05','Sunil Fernando (Hardware Support)','kykfilfil','2026-09-08 07:29:42'),(19,'IT-2026-7684',1,'Hardware','Ministry Office','Medium','fytfdtd',NULL,'Pending','2026-09-09 04:21:24','Unassigned',NULL,'2026-09-09 04:21:24'),(20,'IT-2026-8448',1,'Network','Ministry Office','Low','jhjg','http://127.0.0.1:8000/uploads/1788928448_nejko-computer-5903052.jpg','Pending','2026-09-09 04:34:08','Unassigned',NULL,'2026-09-09 04:34:08'),(21,'IT-2026-8509',1,'Network','Ministry Office','Medium','bv',NULL,'Pending','2026-09-09 04:35:09','Unassigned',NULL,'2026-09-09 04:35:09'),(22,'IT-2026-9112',1,'Network','Ministry Office','Medium','gvtft',NULL,'In_Progress','2026-09-09 04:45:12','Kamal Perera (IT Officer)','ggg','2026-09-09 04:46:51'),(25,'IT-2026-1052',4,'Select Inquiry Type','Ministry Office','High','dfgsrh',NULL,'Pending','2026-09-23 05:24:12','Unassigned',NULL,'2026-09-23 05:24:12'),(29,'IT-2026-6800',4,'System login failure','Administration Division','Medium','ahuk','http://127.0.0.1:8000/uploads/1790226800_Gemini_Generated_Image_dyuj9xdyuj9xdyuj.jpg','Resolved','2026-09-24 05:13:20','Unassigned',NULL,'2026-09-24 05:25:37'),(30,'IT-2026-7653',4,'Forgot Password','IT Unit','Medium','PW','http://127.0.0.1:8000/uploads/1790227653_WhatsApp Image 2026-09-22 at 12.01.40.jpeg','Pending','2026-09-24 05:27:33','Unassigned',NULL,'2026-09-24 05:27:33'),(31,'IT-2026-6896',1,'System login failure','Deputy Minister Office','Medium','dfdfe','http://127.0.0.1:8000/uploads/1790566896_Gemini_Generated_Image_ntoh0intoh0intoh.jpg','Pending','2026-09-28 03:41:36','Unassigned',NULL,'2026-09-28 03:41:36'),(32,'IT-2026-7381',1,'Internet connectivity','Finance Division','Medium','printer','http://127.0.0.1:8000/uploads/1790567381_WhatsApp Image 2026-09-23 at 10.57.35.jpeg','Resolved','2026-09-28 03:49:41','Unassigned',NULL,'2026-09-28 03:51:45'),(33,'IT-2026-8180',1,'Internet connectivity','Administration Division','Medium','ygyg','http://127.0.0.1:8000/uploads/1790568180_WhatsApp Image 2026-09-23 at 10.57.35.jpeg','In_Progress','2026-09-28 04:03:00','Unassigned',NULL,'2026-09-28 04:03:21'),(35,'IT-2026-5722',1,'Hardware','Ministry Office','Low','Testing desktop app integration',NULL,'Pending','2026-10-19 04:55:22','Unassigned',NULL,'2026-10-19 04:55:22'),(36,'IT-2026-5807',1,'Hardware','Ministry Office','Medium','Testing safe file upload','/uploads/67938c82293b_sample.txt','Pending','2026-10-19 04:56:47','Unassigned',NULL,'2026-10-19 04:56:47');
/*!40000 ALTER TABLE `complaints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `departments` (
  `department_id` int(11) NOT NULL AUTO_INCREMENT,
  `department_name` varchar(100) NOT NULL,
  PRIMARY KEY (`department_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES 
(1,'Department of Fisheries & Aquatic Resources'),
(2,'Ocean Resources Division'),
(3,'Administration Division'),
(4,'Finance Division'),
(5,'Ministry Office'),
(6,'Deputy Minister Office'),
(7,'Secretary Office'),
(8,'Internal Audit'),
(9,'Engineering Division'),
(10,'Agriculture Division'),
(11,'IT Unit'),
(12,'Planning Division'),
(13,'Technical Division'),
(14,'Development Division'),
(15,'Government Audit Division'),
(16,'Statistics Unit'),
(17,'National Fisheries Federation');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `role` enum('Staff','Admin') DEFAULT 'Staff',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `department_id` (`department_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Sunil Perera','user@fisheries.gov.lk','$2b$12$5QIo6lXePCdyZf2AmX8RaunDDnUY1aswolrqOXGwgNridlNopt.GO',1,'Staff'),(2,'IT Administrator','admin@fisheries.gov.lk','$2b$12$mie02xx5QgBnrNR0xBTRR.5IYHqHnWkMH7j2Rz1VpA3snhzlT4ZgK',3,'Admin'),(3,'IT Administrator','admin@ministry.gov.lk','$2b$12$uF.UgbFu9yIBtpX4vBggb.JaEYTNHfcocWpJqnEGSPn6ONLYkM3YS',NULL,'Admin'),(4,'Sunil Perera','sunil@ministry.gov.lk','$2b$12$UjC.TFOIU.EwkDQ28BXdbO4gc1dfOQVybWC/XvvU4Hto8oOnBkNvq',NULL,'Staff');
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

-- Dump completed on 2026-10-19 11:22:14
