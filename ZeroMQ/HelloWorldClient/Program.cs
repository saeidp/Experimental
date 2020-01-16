using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using NetMQ;
using NetMQ.Sockets;

namespace HelloWorldClient
{
    class Program
    {
        static void Main(string[] args)
        {
            ////using (var server = new ResponseSocket("@tcp://172.23.18.109:11000")) // bind
            //using (var client = new RequestSocket(">tcp://172.23.18.109:11000"))  // connect
            //{
            //    // Send a message from the client socket
            //    //        client.SendFrame("Hello");

            //    // Receive the message from the server socket
            //    //    string m1 = server.ReceiveFrameString();
            //    // Console.WriteLine("From Client: {0}", m1);

            //    // Send a response back from the server
            //    //  server.SendFrame("Hi Back");

            //    // Receive the response from the client socket
            //    var data = client.ReceiveFrameBytes();
            //    Console.WriteLine("From Server: {0}", data);
            //}

            //using (var client = new RequestSocket())
            //{
            //    //client.Connect("tcp://localhost:5555");
            //    client.Connect("tcp://172.23.18.109:11000");
            //   // for (int i = 0; i < 10; i++)
            //    //{
            //        //Console.WriteLine("Sending Hello");
            //        //client.SendFrame("Hello");
            //        var message = client.ReceiveFrameString();
            //        Console.WriteLine("Received {0}", message);
            //    //}
            //}

            //----------------------------------------------------------------------------
            //using (var router = new RouterSocket())
            //using (var clientSocket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp))
            //{
            //    router.Options.RouterRawSocket = true;
            //    //var port = router.BindRandomPort("tcp://172.23.18.109");
            //    var port = 11000;

            //    clientSocket.Connect(new IPEndPoint(IPAddress.Parse("172.23.18.107"), port));
            //    clientSocket.NoDelay = true;

            //    //byte[] clientMessage = Encoding.ASCII.GetBytes("HelloRaw");
            //    //int bytesSent = clientSocket.Send(clientMessage);
            //    try
            //    {
            //        byte[] id = router.ReceiveFrameBytes();
            //        byte[] message = router.ReceiveFrameBytes();

            //        var buffer = new byte[16];

            //        int bytesRead = clientSocket.Receive(buffer);

            //        Console.Write("HelloRaw", Encoding.ASCII.GetString(buffer, 0, bytesRead));

            //    }
            //    catch (Exception e)
            //    {
            //        Console.WriteLine(e.Message);
            //    }

            //    //   router.SendMoreFrame(id).SendMoreFrame(message); // SendMore option is ignored

            //}

            //---------------------------------------------------------------------------
            try
            {
                // Establish the remote endpoint  
                // for the socket. This example  
                // uses port 11111 on the local  
                // computer. 
                //IPHostEntry ipHost = Dns.GetHostEntry(Dns.GetHostName());
                //IPAddress ipAddr = ipHost.AddressList[0];
                IPAddress ipAddr = IPAddress.Parse("172.23.18.109");

                IPEndPoint localEndPoint = new IPEndPoint(ipAddr, 1100);

                // Creation TCP/IP Socket using  
                // Socket Class Costructor 
                Socket sender = new Socket(ipAddr.AddressFamily,
                                           SocketType.Stream, ProtocolType.Tcp);

                try
                {
                    // Connect Socket to the remote  
                    // endpoint using method Connect() 
                    sender.Connect(localEndPoint);
                    do
                    {
                        while (!Console.KeyAvailable)
                        {

                            // We print EndPoint information  
                            // that we are connected 
                            Console.WriteLine("Socket connected to -> {0} ",
                                              sender.RemoteEndPoint.ToString());


                            // Creation of messagge that 
                            // we will send to Server 
                            byte[] messageSent = Encoding.ASCII.GetBytes("Test Client<EOF>");
                            int byteSent = sender.Send(messageSent);

                            // Data buffer 
                            byte[] messageReceived = new byte[1024];

                            // We receive the messagge using  
                            // the method Receive(). This  
                            // method returns number of bytes 
                            // received, that we'll use to  
                            // convert them to string 
                            int byteRecv = sender.Receive(messageReceived);
                            Console.WriteLine("Message from Server -> {0}",
                                              Encoding.ASCII.GetString(messageReceived,
                                                                       0, byteRecv));
                        }
                    } while (Console.ReadKey(true).Key != ConsoleKey.Escape);

                    //while (true)
                    //{

                    //    // We print EndPoint information  
                    //    // that we are connected 
                    //    Console.WriteLine("Socket connected to -> {0} ",
                    //                      sender.RemoteEndPoint.ToString());


                    //    // Creation of messagge that 
                    //    // we will send to Server 
                    //    byte[] messageSent = Encoding.ASCII.GetBytes("Test Client<EOF>");
                    //    int byteSent = sender.Send(messageSent);

                    //    // Data buffer 
                    //    byte[] messageReceived = new byte[1024];

                    //    // We receive the messagge using  
                    //    // the method Receive(). This  
                    //    // method returns number of bytes 
                    //    // received, that we'll use to  
                    //    // convert them to string 
                    //    int byteRecv = sender.Receive(messageReceived);
                    //    Console.WriteLine("Message from Server -> {0}",
                    //                      Encoding.ASCII.GetString(messageReceived,
                    //                                               0, byteRecv));


                    //}
                    // Close Socket using  
                    // the method Close() 
                    sender.Shutdown(SocketShutdown.Both);
                    sender.Close();
                    Console.Read();

                }

                // Manage of Socket's Exceptions 
                catch (ArgumentNullException ane)
                {
                    Console.WriteLine("ArgumentNullException : {0}", ane.ToString());
                }

                catch (SocketException se)
                {
                    Console.WriteLine("SocketException : {0}", se.ToString());
                }

                catch (Exception e)
                {
                    Console.WriteLine("Unexpected exception : {0}", e.ToString());
                }
            }

            catch (Exception e)
            {
                Console.WriteLine(e.ToString());
            }
        }
    }
}
