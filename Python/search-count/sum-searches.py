import csv

with open('wine-list.csv') as f:
    f = csv.reader(f, delimiter=',')
    listArr = []
    line_count = 0
    for row in f:
        if line_count == 0:
            line_count += 1
            continue
        listArr.append("(" + row[0] + ")")
        


with open('winery-listing-searches-by-month.csv') as csv_file:
    csv_reader = csv.reader(csv_file, delimiter=',')
    search_total = 0
    line_count = 0
    totalsArr = {}
    j = 0

    for r in csv_reader:
        if line_count == 0:
            line_count += 1
            continue
        searchString = r[0]
        for i in range(len(listArr)):
            if listArr[i] in searchString:
                if r[1] in totalsArr:
                    j = int(totalsArr.get(r[1]))
                    j += int(r[2])
                    totalsArr[r[1]] = str(j)
                else:
                    totalsArr[r[1]] = r[2]
                    
                search_total += int(r[2])
                break

    with open('output.csv','w') as f:   
        f.write('Year-Month,Winery Listing Searches\n')
        for key in sorted(totalsArr):
            f.write(key + ',' + totalsArr[key] +'\n')
        f.write('Grand Total,' + str(search_total))

    print('Total is ' + str(search_total))

