#!/bin/bash

# Author: Kazutoyo Osoegawa, Ph.D.
# Developed at Stanford Blood Center
# email: kazutoyo@stanford.edu
# phone: 650-724-0169
# last modified and documented on August 25th, 2025 by Livia Tran
# This script was designed to automatically run ttxplateMap.pl and paste files
# It is set using crontab in every 5 min
# */5 * * * * /data/kazu/workplace/plateMap/autorun.sh

# exit if any commands fail, including Perl scripts
set -e

DATE=`date '+%F'`

PLATE="plateMap/"
cd $PLATE

ttxFile=$1
MIC=$2

# clean up output directory
#OUTPUT="output/"*".csv"	# output file
OUTDIR="output/"	# output directory
for FILE in $(ls $OUTDIR)	# go through input directory
do
	if [ -f $OUTDIR$FILE ]
	then
		rm $OUTDIR$FILE
#		echo $OUTDIR$FILE " is removed."
	fi
done

# strip path, sub out .ttx extension
NAME=$(basename "$ttxFile" .ttx)

IFS='-' read -ra split <<< "$DATE"

YEAR=${split[0]}
MONTH=${split[1]}
DAY=${split[2]}

# take out _LIVIATEST after PROD
TRUNCDATE="${YEAR:2}${MONTH}${DAY}_LIVIATEST"

# this will need to be changed once application is live on server, hopefully on Linux machine???
OUTPATH="/mnt/f/areas/LUM SETUP/SSO BioMek/${YEAR}/${YEAR}_${MONTH}/${TRUNCDATE}"

# FILE STRUCTURE: F:\areas\LUM SETUP\SSO BioMek\<YEAR>\<YEAR>_<MONTH>\<TRUNCATEDYEAR (LAST TWO DIGITS OF YEAR)><MONTH(2 DIGITS)><DATE>
# create new folder for outputs
mkdir -p "${OUTPATH}"

./ttxplateMap.pl $ttxFile $NAME

./compareBarcode.pl  $MIC fifthPage.csv "${OUTPATH}"

OUTFILE="${OUTPATH}/${NAME}_${DATE}.csv"

# print SSO BioMek path for Python processing
echo "$OUTPATH"

paste -d',' firstPage.csv secondPage.csv thirdPage.csv fourthPage.csv fifthPage.csv Version.csv >> "$OUTFILE"
#rm $INPUT

# put input files into directory
cp "$ttxFile" "$OUTPATH"
cp "$MIC" "$OUTPATH"

rm first*
rm second*
rm third*
rm fourth*
rm fifth*
rm Version*

exit 0
