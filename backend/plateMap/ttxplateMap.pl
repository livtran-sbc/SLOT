#!/usr/bin/perl -w

# Author: Kazutoyo Osoegawa, Ph.D.
# Developed at Stanford Blood Center
# email: kazutoyo@stanford.edu
# phone: 650-724-0169

# module: ttxplateMap.pl
# This module was developed to generate work sheet for Biomek
# Input file should be organized as tab separated value (ttx) file
# modified from ITL to EXT as unique identifier
# modified for patient name error
# last modified and documented on August 25, 2026 by Livia Tran

use strict;
use FindBin qw($Bin);
use lib $Bin;
use Openfile;

my $version =  "2026-08-25";	# update here when software is updated

my @list = Openfile::open_file_from_list($ARGV[0]);	# read file
my $name = $ARGV[1];	# added here to capture file name January 4 2022
my %organize;
my $organize_ref = \%organize;
my %exts;	# populate sample information
my $exts_ref = \%exts;
my @wells = ("A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1",
		"A2", "B2", "C2", "D2", "E2", "F2", "G2", "H2",
		"A3", "B3", "C3", "D3", "E3", "F3", "G3", "H3",
		"A4", "B4", "C4", "D4", "E4", "F4", "G4", "H4",
		"A5", "B5", "C5", "D5", "E5", "F5", "G5", "H5",
		"A6", "B6", "C6", "D6", "E6", "F6", "G6", "H6",
		"A7", "B7", "C7", "D7", "E7", "F7", "G7", "H7",
		"A8", "B8", "C8", "D8", "E8", "F8", "G8", "H8",
		"A9", "B9", "C9", "D9", "E9", "F9", "G9", "H9",
		"A10", "B10", "C10", "D10", "E10", "F10", "G10", "H10",
		"A11", "B11", "C11", "D11", "E11", "F11", "G11", "H11",
		"A12", "B12", "C12", "D12", "E12", "F12", "G12", "H12" );
my @loci = ("LT-A", "LT-B", "LT-C", "LTDR", "LTD345", "LTDQB", "LTDPAB");
foreach my $line (@list) {
	unless ( defined $line ) {	# skip empty lines
		next;
	}
	if ($line =~ /LT-*[A-D]+/) {	# capture lines containing locus
		my @required;
		chomp ($line);		# remove tailing new line characters
		$line =~ s/\r//g;	# remove ^M
		$line =~ s/ //g;	# remove space
		$line =~ s/"//g;	# remove "
		@required = split /\t/, $line;
		
		# extract test number
		# "BLANKCONTROL, LAB_TYPE" ("lastName, firstName")
		my $patientName = $required[2];		# patient name
#		print $patientName . "\n";
		my @patient = split /,/, $patientName;
#		my $lastName = shift @patient;	# extract last name
		my $lastName = $patient[0];
		$lastName = $lastName . "_";	# add _
		
		# BLANKCONTROL_1155904_8-16-11_86063 (lastName_TestID_date_ITL)
		my $interfaceID = $required[1];	# interface ID
		my $testID = $interfaceID;
		my $itl = "";
		
		if ( $interfaceID =~ /$lastName\d+_\S+_\d+/ ) {		# very specific format requirement
			$testID =~ s/$lastName//;	# remove last name
			my @decomposed = split /_/, $testID;
			$testID = shift @decomposed;		# first element: test ID
			shift @decomposed;		# remove middle element: date
			$itl = shift @decomposed;	# last element: ITL
		}
		else {
			$testID = "LastNameError";
			$itl = "LastNameError";
		}
#		print $testID . "\n";

		my $serial = $required[0];	# key ID
		$organize_ref->{$serial}->[0] = $testID;

		my $locus = $required[4];	# locus
		my $locus_count = 0;			# This section was added to capture order error
		foreach my $loc ( @loci ) {
			if ( $loc eq $locus ) {
				$locus_count++;
			}
		}
		if ( $locus_count > 0 ) {
			$organize_ref->{$serial}->[1] = $locus;
		}
		else {
			open(FILE, ">output/LOCUS_ERROR.csv");	# if wrong locus is orderd, it will stop
			close FILE;
			open(FILE, ">firstPage.csv");
			close FILE;
			open(FILE, ">secondPage.csv");
			close FILE;
			open(FILE, ">thirdPage.csv");
			close FILE;
			open(FILE, ">fourthPage.csv");
			close FILE;
			open(FILE, ">fifthPage.csv");
			close FILE;
			open(FILE, ">Version.csv" );
			close FILE;
			exit 1;
		}
		
		# organize EXT (key), Well, and concentration
		my $conc = 0;	# no value = 0
		my $len = length $required[5];	# concentration
		if ( $len > 0 ) {
			$conc = $required[5];
		}
		$organize_ref->{$serial}->[2] = $conc;
		$organize_ref->{$serial}->[3] = $itl;

		# added
		my $extraction = $required[3];			
		$organize_ref->{$serial}->[4] = $extraction;

		# added for Fusion on January 4 2022
		$organize_ref->{$serial}->[5] = $patient[0];
		$organize_ref->{$serial}->[6] = $patient[1];

		# organize by extraction number
		$exts_ref->{$extraction}->[0] = "";
		my $count = scalar keys %exts;
		$exts_ref->{$extraction}->[0] = $wells[$count -1];	#Well
		$exts_ref->{$extraction}->[1] = $conc;			#Conc
		#added by request from Kavitha
		if ( exists $required[9] ) {
			$exts_ref->{$extraction}->[2] = $required[9];			#Barcode
		}
		else {
			$exts_ref->{$extraction}->[2] = 0;			#Barcode
		}
	}
}

#first page
my $line_count = 0;
open(FILE, ">firstPage.csv");
print FILE "Serial,TestNum,EXT,Locus,Conc\n";
foreach my $key (sort {$a <=> $b}  keys %organize) {
	print FILE $key . ",";	# series
	print FILE $organize_ref->{$key}->[0] . ",";		#testID
	print FILE $organize_ref->{$key}->[4] . ",";		#EXT
	print FILE $organize_ref->{$key}->[1] . ",";		#Locus
	print FILE $organize_ref->{$key}->[2] . "\n";		#Conc
	$line_count++;
}
close FILE;

#second page
open(FILE, ">secondPage.csv");
print FILE "Sample,Well,Concentration\n";
my %unique;
my $line_num = 0;
foreach my $key (sort {$a <=> $b}  keys %organize) {
	my $ext = $organize_ref->{$key}->[4];
	unless (exists 	$unique{ $ext }) {
		print FILE $ext . ",";		#EXT
		$unique{$ext} = "";
		my @array = @{ $exts_ref-> { $ext } };
		print FILE $array[0] . ",";	#Well
		if ( $array[1] > 35 ) {
			print FILE $array[1] . "\n";	#Conc
		}
		else {
			print FILE "0\n";
		}
		$line_num++;
	}
}
if ( $line_num < $line_count ) {
	for (my $index =0; $index < $line_count - $line_num; $index++) {
		print FILE ",,\n";
	}
}
close FILE;

#third page;
open(FILE, ">thirdPage.csv");
print FILE "TestID,SampleID,Wells,Gene,Position,LC\n";
my $counter = 0;
foreach (my $index = 0; $index < scalar @loci; $index++) {
	my $locus = $loci[ $index ];
	foreach my $key (sort {$a <=> $b}  keys %organize) {
		if ( $locus eq $organize_ref->{ $key }->[1] ) {
			my $ext = $organize_ref->{ $key }->[4];
			print FILE $organize_ref->{ $key }->[0] . ",";	# TestID
			print FILE $ext . ",";				# EXT 
			print FILE $exts_ref->{$ext}->[0] . ",";	# Well
			print FILE $locus . ",";			# Gene
			print FILE $wells[ $counter++ ] . ",";		# Position
			print FILE $index + 1 . "\n";		# Position
		}
	}
}
close FILE;

# fourth page
open(FILE, ">fourthPage.csv");
print FILE "Mix,Volume,Taq\n";
$line_num = 0;
foreach my $locus ( @loci ) {	# go through locus
	my $volume = 0;
	foreach my $key (sort {$a <=> $b}  keys %organize) {
		if ( $locus eq $organize_ref->{ $key }->[1] ) {
			$volume++;
		}
	}
	if ($volume != 0 ) {
		print FILE $locus . ",";
		my $mix = ($volume + 2) * 12;	# add dead volume for 2 samples
		my $tube_vol = 150;	# stock solution volume
		if (( $locus eq "LTD345" ) || ( $locus eq "LTDPAB" )) {
			$tube_vol = 75;		# stock solution volume for DP and DRB345
		}
#		check $mix is larger than $tube_volume
		my $tube_num = 1 + int($mix/$tube_vol);	# added on July 23 2019
#		print FILE $mix . ",";
		$volume = $tube_vol * $tube_num;
		print FILE $volume . ",";
#		my $taq = ( $volume + 2 ) * 0.16;
		my $taq = ( $volume/12 ) * 0.16;
		print FILE $taq . "\n";
		$line_num++;
	}
}
if ( $line_num < $line_count ) {
	for (my $index =0; $index < $line_count - $line_num; $index++) {
		print FILE ",,\n";
	}
}
close FILE;

# Fifth page
open(FILE, ">fifthPage.csv");
print FILE "ITL_NUM,EXT_NUM,CONCEN,RACK,BARCODE\n";
my %unique1;
foreach my $key (sort {$a <=> $b}  keys %organize) {
	my $itl = $organize_ref->{$key}->[3];
	my $ext = $organize_ref->{$key}->[4];
	unless (exists 	$unique1{ $ext }) {
		print FILE $itl . ",";		#ITL
		$unique1{$ext} = "";
		my @array = @{ $exts_ref-> { $ext } };
		print FILE $ext . ",";
		print FILE $array[1] . ",";	#Conc
		print FILE $array[0] . ",";	#Well
		if ( exists $array[2] ) {
			print FILE $array[2] . "\n";	# BARCODE
		}
		else {
			print FILE  "0\n";	# BARCODE
		}
	}
}
close FILE;

open(FILE, ">Version.csv" );
	print FILE "ScriptVersion\n";
	print FILE $version . "\n";
close FILE;



#open(FILE, ">Document/UpdateHistory.txt");
#print FILE "This document includes description about the script updates.\n\n";
#
#print FILE "The initial version of the script was developed in July 2019.\n\n";
#
#print FILE "We decided to scan barcodes on the micronic tube in April 2020.\n\n";
#
#print FILE "A new script to compare barcodes in the amplification list with barcodes from micronic_output\n";
#print FILE "was tested, implemented and validated in May 2020.\n\n";
#
#print FILE "Updated on Friday July 10 2020:\n";
#print FILE "Reviewed and approved: Kalyan C. Mallempati.\n";
#print FILE "Problem1: We originally used ITL as an unique identifier, but we encountered a subject that has two separate\n";
#print FILE "DNA extraction numbers in a single SSO plate.\n";
#print FILE "The script was updated to use DNA extraction number as unique identifier.\n";
#print FILE "Column C: The header name was modified from ITL to EXT.\n";
#print FILE "The information in this column was changed from ITL to DNA extraction number.\n";
#print FILE "Column F and J: The header names “Sample” and “SampleID” are kept.\n";
#print FILE "Because Biomek program uses these header. In the previous version, ITL numbers were listed in these columns,\n";
#print FILE "but DNA extraction numbers are listed in the updated version.\n\n";
#
#print FILE "Updated on Friday July 16 2020:\n";
#print FILE "In the \"Interface ID\" column, the subject last name is shown as \"BC-3,LAB QC\" (note the presence of comma),\n";
#print FILE " while in \"Patient Name\" column, the subject last name is shown as \"BC-3 LAB QC\" (no comma).\n";
#print FILE "Gita sent a note to the group:\n";
#print FILE "Please use ZZZZZ_BC-3_LAB_QC as the QC when ordering tests for your validation run for the SSO set up with Biomek NXp.\n";
#print FILE "We had issues with the Excel program when BC-3 LAB QC was ordered instead (due to the way this QC name was logged in)\n";
#print FILE "The software version is included in the last column in the output file. The version is represented as a date for the update.\n";
#print FILE "When the last name does not match, the script report \"LastNameError.\"\n\n";
#
#
#print FILE "Update on Monday July 20 2020:\n";
#print FILE "If DNA concentration is equal or below 35 ng/ul, the script automatically put 0 as DNA concentration.\n";
#print FILE "The technologists have to manually add appropreate DNA in the plate.\n\n";
#
#print FILE "Update on Thursday July 23 2020:\n";
#print FILE "Modified header from \"CONC\" to \"CONCEN\"\n\n";
#
#print FILE "Updated on Monday August 3 2020:\n";
#print FILE "micronit_output_SOMETHING.txt file name format is required.\n";
#print FILE "FILE_NAME_ERROR file is generated if micronic_output file name does not follow the naming rule\n\n";
#
#print FILE "Updated on Tuesday August 4 2020:\n";
#print FILE "A1: NegativeControl, B1: PositiveControl appear if barcodes do not match in these wells.\n\n";
#
#print FILE "Updated on Tuesday September 29 2020:\n";
#print FILE "The program exits if invalid locus is ordered.\n\n";
#
#print FILE "Updated on Tuesday January 4 2022:\n";
#print FILE "Sample sheet for Fusion is generated per Malissa's request\n";
#print FILE "ITL_TestNum_Ext_LastName_FirstName,1\n";
#print FILE "This strategy did not work, so this section was deleted\n";
#
#print FILE "Bug was reported in fourthPage.csv, when only signle locus, LT-B was ordered.\n";
#
#close FILE;

