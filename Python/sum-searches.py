import csv


with open('wine-list.csv') as f:
    f = csv.reader(f, delimiter=',')
    listArr = []
    line_count = 0
    for row in f:
        if line_count == 0:
            line_count += 1
        else:
            listArr.append("(" + row[0] + ")")
    print(listArr)
        


with open('supermetrics-data.csv') as csv_file:
    csv_reader = csv.reader(csv_file, delimiter=',')
    search_total = 0
    line_count = 0
    searchArr = []
  
    for row in csv_reader:
        if line_count == 0:
            line_count += 1
        else:
            for row in csv_reader:
                searchArr += [row[0],row[1]]
        # print(searchArr)

    for row in csv_reader:
        if line_count == 0:
            line_count += 1
        else:
            # MATCH THE TWO FILES HERE

            line_count += 1
            search_total += int(row[1])
    print('Total is ' + str(search_total))
