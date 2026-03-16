# Plateforme web de suivi d’avancement des projets techniques

## Présentation

Ce projet a été réalisé dans le cadre de mon PFE.  
L’objectif est de développer une application web permettant de suivre l’avancement de projets techniques (fibre optique, livraison de serveurs, etc.) à travers une timeline d’étapes.

L’application permet à l’administrateur de créer et piloter les projets, et au client de consulter l’avancement via un lien public en lecture seule.

---

## Objectif du projet

L’idée principale est de faciliter :
- le suivi d’avancement des projets,
- la communication avec les clients,
- la visualisation des étapes d’un projet,
- la justification des retards, blocages ou annulations.

---

## Fonctionnalités déjà réalisées

### Partie administration
- Dashboard de suivi des projets
- Liste des projets
- Création d’un projet depuis le frontend React
- Définition d’une timeline d’étapes à la création
- Page détail d’un projet
- Mise à jour du statut des étapes
- Gestion des causes pour les étapes en retard ou bloquées
- Statut projet annulé avec cause d’annulation
- Suppression d’un projet
- Génération automatique d’un lien public client

### Partie client
- Consultation publique via un lien/token
- Affichage du projet en lecture seule
- Affichage de la timeline des étapes
- Affichage des causes de retard, blocage ou annulation si disponibles

---

## Technologies utilisées

### Backend
- Python
- Django
- Django REST Framework

### Frontend
- React
- Vite
- Axios

### Base de données
SQLite (version actuelle de développement avant de migrer vers mysql)


