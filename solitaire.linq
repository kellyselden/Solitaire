<Query Kind="Statements" />

string[] xs = { "C", "D", "H", "S" };
string[] ys = { "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K" };
for (int x = 0; x < xs.Length; x++)
	for (int y = 0; y < ys.Length; y++)
	{
		//Console.WriteLine(string.Format("int {0}{1} = {2};", xs[x], ys[y], x * ys.Length + y));
		string prefix;
		string suffix = "";
		if (ys[y] == "A")
		{
			prefix = "01";
			suffix = "_A";
		}
		else if (ys[y] == "J")
		{
			prefix = "Jack";
			suffix = "_en";
		}
		else if (ys[y] == "Q")
		{
			prefix = "Queen";
			suffix = "_en";
		}
		else if (ys[y] == "K")
		{
			prefix = "King";
			suffix = "_en";
		}
		else
		{
			prefix = int.Parse(ys[y]).ToString("0#");
		}
		string suit = null;
		if (xs[x] == "C")
			suit = "clubs";
		else if (xs[x] == "D")
			suit = "diamonds";
		else if (xs[x] == "H")
			suit = "hearts";
		else if (xs[x] == "S")
			suit = "spades";
		//Console.WriteLine(string.Format("//cards[{0}{1}] = new Card({0}{1}, \"{2}_of_{3}{4}.svg\");", xs[x], ys[y], prefix, suit, suffix));
		Console.Write(string.Format("png/{0}-{1}-150.png,", suit, ys[y].ToLower()));
		//Console.WriteLine(string.Format("cards[{0}{1}] = new Card({0}{1}, \"{2}-{3}-150.png\");", xs[x], ys[y], suit, ys[y].ToLower()));
	}