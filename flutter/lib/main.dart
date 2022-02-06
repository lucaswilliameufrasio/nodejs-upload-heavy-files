import 'dart:math';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:socket_io_client/socket_io_client.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Uploading files using BusBoy',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: MyHomePage(title: 'Uploading files using BusBoy'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  MyHomePage({Key key, this.title}) : super(key: key);

  final String title;

  @override
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  String pendingToUpload = '0 bytes';
  IO.Socket socket;
  String socketId;
  int bytesAmount;
  List<PlatformFile> files;
  final apiUrl = 'http://10.0.2.2:3000';
  final onUploadEvent = "file-uploaded";

  String formatBytes(int bytes, {int decimals = 2}) {
    if (bytes == 0 || bytes.isInfinite || bytes.isNaN) {
      return '0 bytes';
    }

    final k = 1024;
    final decimalPlaces = decimals < 0 ? 0 : decimals;
    final sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    final i = (log(bytes) / log(k)).floor();

    return '${(bytes / pow(k, i)).toStringAsFixed(decimalPlaces)} ${sizes[i]}';
  }

  void updateSize(int totalSize) {
    setState(() {
      pendingToUpload = '${formatBytes(totalSize)}';
    });
  }

  Future<void> pickFiles() async {
    await FilePicker.platform.clearTemporaryFiles();
    FilePickerResult result =
        await FilePicker.platform.pickFiles(allowMultiple: true);

    if (result != null) {
      files = result.files.map((file) => file).toList();
      int totalSize = result.files.fold(0, (previous, file) {
        return previous + file.size;
      });

      bytesAmount = totalSize;
      updateSize(totalSize);
    } else {
      print('The user has canceled the files selection.');
    }
  }

  Future<void> uploadFiles(BuildContext context) async {
    try {
      final url = '$apiUrl/?socketId=$socketId';
      var dio = Dio();
      FormData formData = FormData.fromMap({
        "files": files
            .map<MultipartFile>((file) =>
                MultipartFile.fromFileSync(file.path, filename: file.name))
            .toList(),
      });
      var response = await dio.post(url, data: formData);
      print(response);
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Files uploaded with success!')));
    } catch (error) {
      print(error);
    }
  }

  void initSocket() {
    if (socket == null || socket.disconnected) {
      socket = IO.io(
          apiUrl,
          OptionBuilder()
              .setTransports(['websocket'])
              .enableAutoConnect()
              .build());
      socket.onError((data) {
        print('Socket error: $data');
      });
      socket.onConnectError((error) {
        print('Connection error: $error');
      });
      socket.onConnectTimeout((_) {
        print('Connection timeout');
      });
      socket.onConnect((_) {
        socketId = socket.id;
        print('Connected with id: ${socket.id}');
      });
      socket.on(onUploadEvent, (bytesReceived) {
        print('Received: $bytesReceived');
        bytesAmount = bytesAmount - bytesReceived;
        updateSize(bytesAmount);
      });
    }
  }

  @override
  void initState() {
    super.initState();
    initSocket();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Padding(
                padding: EdgeInsets.all(20),
                child: Text(
                  'Uploading files using BusBoy',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
                  textAlign: TextAlign.center,
                ),
              ),
              RaisedButton(
                child: Text('Choose files'),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                onPressed: pickFiles,
              ),
              Padding(
                padding: EdgeInsets.all(8.0),
                child: Text('Pending to send: $pendingToUpload'),
              ),
              Builder(
                builder: (context) {
                  return RaisedButton(
                    child: Text('Send'),
                    color: Colors.green,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    textColor: Colors.white,
                    onPressed: () => uploadFiles(context),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
