# Imports
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import random

# Global Variables
GAMES = []
with open('valid-wordle-words.txt') as f:
    VALID_WORDS = f.read().splitlines()

# Set up Flask app with flask_socketio
app = Flask(__name__, template_folder='templates', static_folder='static', static_url_path='/static/')
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def index():
    return render_template('wordle.html')

# Listen for events from the clients
@socketio.on('client-guess')
def receive_guess(client_guess):
    """
    :param client_guess: of form {'guess': guess, 'game_id': game}
    :return:
         This function will emit data in the form {'valid': is_valid, 'guess': guess, 'feedback': feedback} to all
         clients that are part of the game
            is_valid - is the guess a valid word from our word bank
            guess - the original guess
            feedback - an array of 5 digits indicating the correctness of the guess
                0 - character is not in the word
                1 - character is in the word but in the wrong position
                2 - character is in the word and in the correct position
                ex. If the word is "tests" and the guess is "trace":
                    feedback = [2, 0, 0, 0, 1]
    """
    global GAMES
    game_id = client_guess['game_id']
    guess = client_guess['guess']
    word = ""
    player1 = None
    player2 = None
    for game in GAMES:
        if game_id == game['game_id']:
            word = game['random_word']
            player1 = game['clients']['player_1']
            player2 = game['clients']['player_2']
    # If player 2 hasn't joined yet...
    if player2['client'] is None:
        emit('guess-feedback', {'valid': False, 'guess': guess, 'feedback': -1}, room=player1['client'])
        return
    is_valid, feedback = check_guess(guess, word)
    emit('guess-feedback', {'valid': is_valid, 'guess': guess, 'feedback': feedback}, room=player1['client'])
    emit('guess-feedback', {'valid': is_valid, 'guess': guess, 'feedback': feedback}, room=player2['client'])


@socketio.on('client-connection')
def connect_client(client_info):
    """
    :param client_info: in form {'name': name, 'game_id': game_id}
    :return:
        This function emits data to the relevant clients in the form
        {'game_id': 4 digit integer representing game_id,
        'player_1': string for player 1's name,
        'player_2': string for player 2's name}
    """
    global GAMES
    client_name = client_info['name']
    client_game = client_info['game_id']
    game_ids = []
    # If game_id exists, join client to that game
    for game in GAMES:
        game_ids.append(game['game_id'])
        if client_game == game['game_id'] and (game['clients']['player_1']['client'] is None or game['clients']['player_2']['client'] is None):
            player1 = game['clients']['player_1']
            player2 = game['clients']['player_2']
            player2['name'] = client_name
            player2['client'] = request.sid
            info = {'game_id': game['game_id'], 'player_1': player1['name'], 'player_2': player2['name']}
            emit('client-information', info, room=player1['client'])
            emit('client-information', info, room=player2['client'])
            return
    # game_id doesn't exist - create one and assign player 1
    client_game = generate_id(game_ids)
    new_game = {'game_id': client_game, 'random_word': generate_random_word(),
                'clients': {'player_1': {'client': request.sid, 'name': client_name},
                            'player_2': {'client': None, 'name': "Waiting to Connect"}}}
    GAMES.append(new_game)
    # Emit to client 1
    player1 = new_game['clients']['player_1']
    player2 = new_game['clients']['player_2']
    info = {'game_id': new_game['game_id'], 'player_1': player1['name'], 'player_2': player2['name']}
    emit('client-information', info, room=player1['client'])


@socketio.on('requesting-correct')
def send_correct(game_id):
    """
    :param game_id: 4 digit number
    :return:
        This function will emit the game's correct word to all clients that are a part of the game
    """
    for game in GAMES:
        if game_id == game['game_id']:
            word = game['random_word']
            player1 = game['clients']['player_1']
            player2 = game['clients']['player_2']
            emit('correct-word', word, room=player1['client'])
            emit('correct-word', word, room=player2['client'])


# Helper functions
def check_guess(guess, word):
    """
    :param guess: the player's guess for the word
    :param word: the correct word for the game
    :return:
    - a boolean value indicating if the word is a valid word or not
    - an array of length 5 with values 0, 1, or 2
        0 signifies the letter is not in the word
        1 signifies the letter is in the word and in the wrong position
        2 signifies the letter is in the word and in the right position
    """
    global VALID_WORDS
    guess = guess.lower()
    # Check if the word is valid
    valid = guess in VALID_WORDS
    feedback = [0, 0, 0, 0, 0]
    assert(len(word) == 5)
    assert(len(guess) == 5)
    other_chars = ""
    # Check for perfect matches
    for i in range(0, 5):
        if guess[i] == word[i]:
            feedback[i] = 2
        else:
            other_chars = other_chars + word[i]
    # Check for partial/no matches
    for i in range(0, 5):
        if feedback[i] != 2:
            if guess[i] in other_chars:
                feedback[i] = 1
            else:
                feedback[i] = 0
    return valid, feedback


def generate_id(game_ids):
    """
    :param game_ids: the current game ids that are in use
    :return: a new game id that isn't in use yet
    """
    id = random.randint(1000, 9999)
    while id in game_ids:
        id = random.randint(1000, 9999)
    return str(id)


def generate_random_word():
    """
    :return: a random word from our word bank
    """
    global VALID_WORDS
    word = random.choice(VALID_WORDS)
    return word


if __name__ == '__main__':
    socketio.run(app)
