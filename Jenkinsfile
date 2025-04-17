pipeline {
    agent any
    environment {
        PATH = "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
    }
    stages {
        stage('Debug Path') {
            steps {
                sh 'echo $PATH'
                sh 'ls -l /usr/local/bin/docker'
                sh 'whoami'
            }
        }

        stage('Checkout Backend') {
            steps {
                echo "Checkout Backend"
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[credentialsId: 'nawarat', url: 'https://github.com/NawratvPatnantaporn/WRU_Backend.git']]
                ])
                echo "Checkout Backend Success"
            }
        }

        stage('Build Backend') {
            steps {
                echo "Docker Build Backend Image"
                script {
                    sh "docker build -t wru_backend ."
                    echo "Docker Build Backend Image Success"
                }

                echo "Docker Run Backend Container"
                script {
                    sh "docker rm -f wru_backend-run || true"
                    sh "docker run -d --name wru_backend-run -p 50100:50100 wru_backend"
                    echo "Docker Run Backend Container Success"
                }
            }
        }

        stage('Test Backend') {
            steps {
                echo 'Test Backend..'
            }
        }
    }
}
