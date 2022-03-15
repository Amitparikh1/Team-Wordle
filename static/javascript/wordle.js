LETTER_INDEX = 0;
ROW_INDEX = 1;
PLAYER_NUM = null;
PLAYER_TURN = 1;
function connect_to_server() {
    // Connect to server
    socket = io.connect('http://127.0.0.1:5000');
    socket.on('connect', function(){
        socket.emit('client-connection', document.getElementById("name-input").value);
    });
    once_connected(socket);
}

function once_connected(socket){
    socket.on('client-information', function(players_info){
        if (PLAYER_NUM == null) {
            PLAYER_NUM = players_info.length;
        }
        players_info.forEach(player =>{
            let player_num = player['player_num'];
            let player_name = player['player_name']
            document.getElementById("player-"+ player_num + "-name").innerHTML = player_name;
        });
        if (players_info.length == 2) {
            document.getElementById("name-label").innerHTML = "Game is full";
            document.getElementById("name-input").disabled = true;
            document.getElementById("start-game").disabled = true;
        }
    });
    socket.on('guess-feedback', function(data){
        console.log(data);
        if (!data['valid']){
            if (PLAYER_NUM == PLAYER_TURN) {
                document.getElementById("lower-message").innerHTML = "Not a valid word - guess again"
            }
            return
        }
        document.getElementById("lower-message").innerHTML = ""
        let guess = data['guess'];
        let feedback = data['feedback'];
        // Case where word was not valid
        // If word was a valid guess
        // Flip player turn
        if (PLAYER_TURN == 1) {
            PLAYER_TURN = 2;
        }
        else {
            PLAYER_TURN = 1;
        }
        // Increment row number & reset letter index
        ROW_INDEX += 1;
        LETTER_INDEX = 0;
        // Shade previous rows letters
        for (let i = 1; i <= 5; i++) {
            let color = document.getElementById('row-' + ROW_INDEX + '-letter-' + i).style.backgroundColor;
            if (feedback[i - 1] == 1) {
                color = "#FAFDBA"
            }
            else if (feedback[i - 1] == 2) {
                color = "#B2F97B"
            }
            document.getElementById('row-' + (ROW_INDEX - 1) + '-letter-' + i).style.backgroundColor = color;
            document.getElementById('row-' + (ROW_INDEX - 1) + '-letter-' + i).innerHTML = guess[i - 1];
        }
    });
    document.onkeydown = function (e) {
        if (PLAYER_NUM == PLAYER_TURN) {
            if (LETTER_INDEX >= 5 && e.keyCode == 13) {
                // Get guess from divs
                let guess = "";
                for (let i = 1; i <= 5; i++) {
                    guess = guess.concat(document.getElementById('row-' + ROW_INDEX + '-letter-' + i).innerHTML);
                }
                console.log(guess);
                // Send guess to server
                socket.emit('client-guess', guess);
            }
            if (e.keyCode == 8) {
                key = "";
            }
            else if ((e.keyCode >= 65 && e.keyCode <= 90) || (e.keyCode >= 97 && e.keyCode <= 122)) {
                // Letter passed
                key = e.key;
            }
            else {
                return;
            }
            if (LETTER_INDEX < 1) {
                LETTER_INDEX = 1;
            }
            else if (LETTER_INDEX > 5) {
                LETTER_INDEX = 5;
            }
            console.log(key);
            curr_box = document.getElementById('row-' + ROW_INDEX + '-letter-' + LETTER_INDEX);
            curr_box.innerHTML = key;
            if (e.keyCode == 8) {
                LETTER_INDEX -= 1;
            }
            else if ((e.keyCode >= 65 && e.keyCode <= 90) || (e.keyCode >= 97 && e.keyCode <= 122)) {
                LETTER_INDEX += 1;
            }
        }
    }
}
