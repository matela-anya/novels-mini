from flask import Flask, request, jsonify
import hmac
import hashlib
import os

app = Flask(__name__)

# Токен вашего бота Telegram
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

# Тестовые данные для новелл
novels = [
    {"id": 1, "title": "Первая новелла", "cover": "/images/cover1.jpg", "totalChapters": 20, "createdAt": "2023-12-01T12:00:00Z", "publishedChapters": 20},
    {"id": 2, "title": "Вторая новелла", "cover": "/images/cover2.jpg", "totalChapters": 15, "createdAt": "2023-11-15T12:00:00Z", "publishedChapters": 15}
]

chapters = []
stored_tags = set(["фантастика", "романтика", "драма", "приключения", "мистика"])  # Набор для тегов

def verify_telegram_auth(data):
    """Верификация данных авторизации Telegram"""
    auth_data = dict(data)
    hash_received = auth_data.pop('hash', None)
    if not hash_received:
        return False
    check_string = "\n".join(f"{key}={auth_data[key]}" for key in sorted(auth_data.keys()))
    secret_key = hashlib.sha256(TELEGRAM_TOKEN.encode()).digest()
    expected_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(hash_received, expected_hash)

@app.route('/api/auth', methods=['POST'])
def auth():
    """Эндпоинт авторизации Telegram"""
    try:
        data = request.json
        if not verify_telegram_auth(data):
            return jsonify({"error": "Invalid Telegram authorization"}), 403
        return jsonify({"message": "Authorization successful", "user": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/novels', methods=['GET', 'POST'])
def novels_route():
    """Эндпоинт для работы с новеллами"""
    try:
        if request.method == 'GET':
            page = int(request.args.get('page', 1))
            page_size = int(request.args.get('pageSize', 10))
            start = (page - 1) * page_size
            end = start + page_size
            return jsonify(novels[start:end])
        elif request.method == 'POST':
            data = request.json
            new_novel = {
                "id": len(novels) + 1,
                "title": data['title'],
                "description": data['description'],
                "tags": data['tags'],
                "totalChapters": data['totalChapters'],
                "author": data['author'],
                "yearStarted": data['yearStarted']
            }
            novels.append(new_novel)
            stored_tags.update(data['tags'])  # Сохраняем уникальные теги
            return jsonify({"message": "Новелла добавлена!", "novel": new_novel}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/chapters', methods=['POST'])
def add_chapter():
    """Эндпоинт для добавления главы"""
    try:
        data = request.json
        chapter = {
            "novelId": data['novelId'],
            "chapterNumber": data['chapterNumber'],
            "title": data['title'],
            "text": data['text']
        }
        chapters.append(chapter)
        return jsonify({"message": "Глава добавлена!", "chapter": chapter}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/tags', methods=['GET'])
def get_tags():
    """Эндпоинт для получения всех уникальных тегов"""
    return jsonify(list(stored_tags))

@app.route('/api/init-db', methods=['GET'])
def init_db():
    """Эндпоинт инициализации базы данных"""
    return jsonify({"message": "База данных успешно инициализирована!"})

if __name__ == "__main__":
    app.run()
