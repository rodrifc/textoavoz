﻿class SocketEdgeTTS {
	constructor(_indexpart, _filename, _filenum,
				_voice, _pitch, _rate, _volume, _text,
				_statArea, _obj_threads_info, _save_to_var) {
		this.bytes_data_separator = new TextEncoder().encode("Path:audio\r\n")
		this.data_separator = new Uint8Array(this.bytes_data_separator)
		
		this.my_uint8Array = new Uint8Array(0)
		this.audios = []
		
		this.indexpart = _indexpart
		this.my_filename = _filename
		this.my_filenum = _filenum
		this.my_voice = _voice
		this.my_pitch = _pitch
		this.my_rate = _rate
		this.my_volume = _volume
		this.my_text = _text
		this.socket
		this.statArea = _statArea
		this.mp3_saved = false
		this.save_to_var = _save_to_var
		this.obj_threads_info = _obj_threads_info
		this.end_message_received = false
		this.start_save = false	
		
		//Start
		this.start_works()
	}

	clear() {
		//this.socket = null;	
		this.end_message_received = false	
		this.my_uint8Array = null
		this.my_uint8Array = new Uint8Array(0)
		for (let part of this.audios) {
			part = null
		}
		this.audios = []
		this.start_save = false
	}

	date_to_string() {
		const date = new Date()
		const options = {
			weekday: 'short',
			month: 'short',
			day: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZoneName: 'short',
		}
		const dateString = date.toLocaleString('en-US', options)
		return dateString.replace(/\u200E/g, '') + ' GMT+0000 (Coordinated Universal Time)'
	}	

	onSocketOpen(event) {
		this.end_message_received = false
		this.update_stat("ferozmente")
		
		var my_data = this.date_to_string()
		this.socket.send(
			"X-Timestamp:" + my_data + "\r\n" +
			"Content-Type:application/json; charset=utf-8\r\n" +
			"Path:speech.config\r\n\r\n" +
			'{"context":{"synthesis":{"audio":{"metadataoptions":{' +
			'"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":true},' +
			'"outputFormat":"audio-24khz-96kbitrate-mono-mp3"' +
			"}}}}\r\n"
		)
			
		this.socket.send(
			this.ssml_headers_plus_data(
				this.connect_id(),
				my_data,
				this.mkssml()
			)
		)
	}
		
	async onSocketMessage(event) {
		const data = await event.data
		if ( typeof data == "string" ) {
			if (data.includes("Path:turn.end")) {
				this.end_message_received = true
				//console.log("Path:turn.end ", this.indexpart)
				//Обработка частей Blob с последующим сохранением в mp3
				for (let _ind = 0; _ind < this.audios.length; _ind++) {
					const reader_result = await this.audios[_ind].arrayBuffer()
					const uint8_Array = await new Uint8Array(reader_result)
					
					// Ищем все позиции байтов, равных "\r\n"
					let posIndex = this.findIndex(uint8_Array, this.data_separator)
					const parts = []
					if (posIndex !== -1) {
						// Разрезаем Blob на части
						const partBlob = this.audios[_ind].slice(posIndex + this.data_separator.length)
						parts.push(partBlob)

					}
					
					if (parts.length > 0 && parts[0] instanceof Blob) {
						const buffer = await parts[0].arrayBuffer()
						const uint8_Array2 = await new Uint8Array(buffer)
						const combinedUint8Array = await new Uint8Array(this.my_uint8Array.length + uint8_Array2.length)
						combinedUint8Array.set(this.my_uint8Array, 0)
						combinedUint8Array.set(uint8_Array2, this.my_uint8Array.length)
						this.my_uint8Array = await combinedUint8Array
					}
				}
				//console.log(this.audios.length)
				this.save_mp3()
			}
		}
		
		if (data instanceof Blob) {
			await this.audios.push(data)
		}
	}
	
	update_stat(msg) {
		let statlines = this.statArea.value.split('\n');
		statlines[this.indexpart]= "Ladrando " + (this.indexpart+1).toString().padStart(4, '0') + ": " + msg
		this.statArea.value = statlines.join('\n')
	}

	onSocketClose() {
		if ( !this.mp3_saved ) {
			if ( this.end_message_received == true ) {
				this.update_stat("         a mi líder")
			} else {
				this.update_stat("a los invitados - ferozmente")
				let self = this
				let timerId = setTimeout(function tick() {
					self.my_uint8Array = new Uint8Array(0)
					self.audios = []
					self.start_works()
				}, 10000)				
			}
		} else {
			//this.update_stat("fuerte")
		}
		add_edge_tts(this.save_to_var)
	}
	
	start_works() {
		//console.log("Start works...")//console.log(this.my_filename + " " + this.my_filenum + " start works...")
		if ("WebSocket" in window) {
			this.socket = new WebSocket(
				"wss://speech.platform.bing.com/consumer/speech/synthesize/" +
				"readaloud/edge/v1?TrustedClientToken=" +
				"6A5AA1D4EAFF4E9FB37E23D68491D6F4" +
				"&ConnectionId=" + this.connect_id())
			this.socket.addEventListener('open', this.onSocketOpen.bind(this))
			this.socket.addEventListener('message', this.onSocketMessage.bind(this))
			this.socket.addEventListener('close', this.onSocketClose.bind(this))
		} else {
			console.log("WebSocket NOT supported by your Browser!");
		}
		add_edge_tts(this.save_to_var)
	}

	mkssml() {
		return (	
			"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>\n" +
			"<voice name='" + this.my_voice + "'><prosody pitch='" + this.my_pitch + "' rate='" + this.my_rate + "' volume='" + this.my_volume + "'>\n" +
			this.my_text + "</prosody></voice></speak>"
		)
	}

	connect_id() {
		const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			const r = (Math.random() * 16) | 0;
			const v = c == 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
		return uuid.replace(/-/g, '');
	}
	
	async saveFiles(blob) {
		if (this.start_save == false) {
			this.start_save = true
			const new_folder_handle = await save_path_handle.getDirectoryHandle(this.my_filename, { create: true });			
			const fileHandle = await new_folder_handle.getFileHandle(this.my_filename + " " + this.my_filenum + '.mp3', { create: true });
			const writableStream = await fileHandle.createWritable();
			const writable = writableStream.getWriter();
			await writable.write(blob);
			await writable.close();
			this.clear()
		}
	}
	
	save_mp3() {
		//console.log("Save_mp3");
		if ( this.my_uint8Array.length > 0 ) {
			this.mp3_saved = true
			if ( !this.save_to_var ) {				
				var blob_mp3 = new Blob([this.my_uint8Array.buffer]);
				if (save_path_handle ?? false) {
					this.saveFiles(blob_mp3)
				} else {
					const url = window.URL.createObjectURL(blob_mp3);
					const link = document.createElement('a');
					link.href = url;
					link.download = this.my_filename + " " + this.my_filenum + '.mp3';
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					window.URL.revokeObjectURL(url);
					this.clear()
				}
			}
			this.update_stat("mucho")
			this.obj_threads_info.count += 1
			const stat_count = this.obj_threads_info.stat.textContent.split(' / ');
			this.obj_threads_info.stat.textContent = String(Number(stat_count[0]) + 1) + " / " + stat_count[1]
			add_edge_tts(this.save_to_var)
		} else {
			console.log("Bad Save_mp3");
		}
	}

	ssml_headers_plus_data(request_id, timestamp, ssml) {
		return "X-RequestId:" + request_id + "\r\n" +
			"Content-Type:application/ssml+xml\r\n" +
			"X-Timestamp:" + timestamp + "Z\r\n" +
			"Path:ssml\r\n\r\n" +
			ssml
	}
		
	findIndex(uint8Array, separator) {
	  for (let i = 0; i < uint8Array.length - separator.length + 1; i++) {
		let found = true
		for (let j = 0; j < separator.length; j++) {
		  if (uint8Array[i + j] !== separator[j]) {
			found = false
			break
		  }
		}
		if (found) {
		  return i
		}
	  }
	  return -1
	}
}