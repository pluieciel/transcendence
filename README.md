# ft_transcendance

## Online Version
https://pong42.jorislefondeur.com/

## Overview
ft_transcendance is a full-stack web application designed as a modern multiplayer Pong game with authentication, chat, and matchmaking features. This project follows the 42 School guidelines and aims to provide a seamless gaming experience with real-time interactions.

## Features
- **User Authentication**: Secure login and registration using OAuth2.
- **Multiplayer Pong**: Play against other users in real-time.
- **Chat System**: Engage in private and public conversations.
- **Matchmaking System**: Find and play with opponents online.
- **Customization**: Change the color theme, with earned colors through achievements
- **User Profiles**: Track player stats and history.
- **2FA Security**: Two-factor authentication for enhanced account protection.
- **Admin**: View all sort of information in real time

## Technologies Used
- **Frontend**: Javascript (Bootstrap, THREE.Js)
- **Backend**: Django (python framework)
- **Database**: PostgreSQL
- **Logging**: ElasticSearch (Kibana), CAdvisor, Grafana, Prometheus and Node Exported
- **Authentication**: OAuth2, JWT, Two-Factor Authentication (2FA)
- **Containerization**: Docker

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/pluieciel/transcendance.git
   cd ft_transcendance
   ```
2. Configure the environment variables:
   - In the root of the project: `./init.sh` or `make init`
   - Copy the `.env.example` file to `.env` in `docker/`
   - Add your secrets in `OAUTH_CLIENT_ID_FILE` and `OAUTH_CLIENT_SECRET_FILE` if you want to use the 42 logging

5. Start the application:
   - **Using the Makefile**
     ```bash
     make all
     ```
   - **Manually**
     ```bash
     docker-compose -f ./docker/docker-compose.yml -p $(NAME) build
     docker-compose -f ./docker/docker-compose.yml -p my_project up -d
     ```

## Usage
- Open your browser and navigate to `https://localhost:9000`.
- Register or log in using OAuth2.
- Start a game or chat with other users.

## Contributors:
- [@pluieciel](https://github.com/pluieciel)
- [@jlefonde](https://github.com/jlefonde)
- [@siul008](https://github.com/siul008)
- [@neutrou](https://github.com/neutrou)
